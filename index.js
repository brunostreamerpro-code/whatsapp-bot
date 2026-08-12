import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import { searchPlate } from './services/querybuscas.js';
import { extractPlateNumber } from './utils/parser.js';
import { initRedis, saveConsultation, saveUserContext, getUserContext, closeRedis } from './services/redis.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detectar se está rodando no Render
const isRender = process.env.RENDER === 'true' || process.env.RENDER_GIT_REPO;

const logger = pino({
  transport: isRender
    ? undefined // JSON logging em produção
    : { target: 'pino-pretty' } // Pretty print em desenvolvimento
});

let sock;
let isConnected = false;

// Armazenar contexto de conversas (qual placa foi consultada por cada usuário)
const userContext = new Map();

async function connectWhatsApp() {
  try {
    logger.info('📱 Carregando estado da sessão...');
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    logger.info('🔌 Criando socket WhatsApp...');
    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' })
    });
    logger.info('✅ Socket criado com sucesso');
  } catch (err) {
    logger.error('❌ Erro ao conectar:', err.message);
    throw err;
  }

  logger.info('Registrando event listeners...');

  try {
    logger.info('Registrando connection.update...');
    sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    logger.info(`📡 connection.update recebido - connection: ${connection}, qr: ${!!qr}`);

    if (qr) {
      logger.info('📱 QR Code gerado! Escaneando...\n');

      try {
        // Salvar QR Code em arquivo
        await QRCode.toFile('qrcode.png', qr, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 300,
          margin: 1
        });
        logger.info('✅ QR Code salvo em: qrcode.png');
        logger.info('📲 Escaneie com seu WhatsApp!\n');
      } catch (err) {
        logger.error('Erro ao salvar QR:', err);
      }
    }

    if (connection === 'close') {
      if ((lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
        logger.info('Reconectando...');
        connectWhatsApp();
      } else {
        logger.info('Desconectado pelo usuário');
      }
    } else if (connection === 'open') {
      isConnected = true;
      logger.info('✅ Conectado ao WhatsApp!\n');
      logger.info('🤖 Bot pronto para receber mensagens!\n');

      // Notificar dashboard
      try {
        await fetch('http://localhost:3000/api/status', { method: 'POST' }).catch(() => {});
      } catch (e) {
        // Ignorar erro se dashboard não estiver rodando
      }
    }
  });

    logger.info('✅ connection.update registrado');
  } catch (e) {
    logger.error('❌ Erro ao registrar connection.update:', e?.message);
    throw e;
  }

  try {
    logger.info('Registrando creds.update...');
    sock.ev.on('creds.update', () => {
      saveCreds().catch(err => logger.error('Erro ao salvar credenciais:', err.message));
    });
    logger.info('✅ creds.update registrado');
  } catch (e) {
    logger.error('❌ Erro ao registrar creds.update:', e?.message);
    throw e;
  }

  try {
    logger.info('Registrando messages.upsert...');
    sock.ev.on('messages.upsert', async (m) => {
    const message = m.messages[0];

    if (!message.message || message.key.fromMe) return;

    const sender = message.key.remoteJid;
    const messageText = message.message.conversation ||
                       message.message.extendedTextMessage?.text || '';

    logger.info(`📨 Mensagem de ${sender}: ${messageText.trim()}`);

    // Verificar se é resposta para pergunta de câmbio
    const response = messageText.trim();
    if (response === '1' || response === '2') {
      const context = userContext.get(sender);
      if (context && context.plate && context.data) {
        // Se está aguardando resposta de tipo de câmbio
        if (context.step === 'waiting_transmission_type') {
          await handleTransmissionTypeResponse(sender, response, context.data);
          return;
        }
      }
    }

    // Tentar extrair placa
    const plate = extractPlateNumber(messageText);

    if (plate) {
      await handlePlateQuery(sender, plate);
    } else {
      await sock.sendMessage(sender, {
        text: '❌ Placa não reconhecida.\n\nEnvie a placa no formato:\n• ABC1234 (placa antiga)\n• ABC1D23 (Mercosul)'
      });
    }
    });
    logger.info('✅ messages.upsert registrado');
  } catch (e) {
    logger.error('❌ Erro ao registrar messages.upsert:', e?.message);
    throw e;
  }
}

async function handlePlateQuery(sender, plate) {
  try {
    // Garantir que a placa está em maiúscula
    plate = plate.toUpperCase();

    await sock.sendPresenceUpdate('composing', sender);

    logger.info(`🔍 Buscando placa: ${plate}`);

    const plateData = await searchPlate(plate);

    if (!plateData) {
      await sock.sendMessage(sender, {
        text: '❌ Placa não encontrada no sistema.'
      });
      return;
    }

    // Enviar detalhes da placa
    const details = formatPlateDetails(plateData);
    await sock.sendMessage(sender, { text: details });

    // Aguardar um pouco antes de fazer a pergunta
    await new Promise(r => setTimeout(r, 1000));

    // Armazenar contexto para esta conversa
    userContext.set(sender, {
      plate: plate,
      data: plateData,
      step: 'waiting_transmission_type',
      timestamp: Date.now()
    });

    // Aguardar um pouco antes de perguntar
    await new Promise(r => setTimeout(r, 800));

    // Fazer pergunta sobre tipo de câmbio
    await sock.sendMessage(sender, {
      text: `
*Qual é o tipo de câmbio do veículo?*

1️⃣ Automático
2️⃣ Manual

Digite *1* ou *2* para continuar.
      `
    });

    logger.info(`✅ Aguardando resposta sobre tipo de câmbio para ${sender}`);

  } catch (error) {
    logger.error(`Erro: ${error.message}`);
    await sock.sendMessage(sender, {
      text: '⚠️ Erro ao consultar placa. Tente novamente mais tarde.'
    });
  }
}

async function handleTransmissionTypeResponse(sender, response, plateData) {
  try {
    const transmissionType = response === '1' ? 'Automático' : 'Manual';

    await sock.sendPresenceUpdate('composing', sender);

    // Salvar consulta no Redis
    await saveConsultation(sender, plateData.plate, plateData, transmissionType);

    // Responder com resumo completo
    const responseMessage = `
✅ *Cotação registrada com sucesso!*

📋 *Resumo da consulta:*
• Placa: ${plateData.plate}
• Veículo: ${plateData.vehicle}
• Valor FIPE: ${plateData.fipe}
• Ano: ${plateData.year}

🔧 *Dados do veículo:*
• Câmbio: ${transmissionType}

💡 *Próximos passos:*
Você será contactado em breve por um de nossos consultores com as melhores opções de seguro!

Obrigado! 🙏
    `;

    await sock.sendMessage(sender, { text: responseMessage });

    logger.info(`✅ Cotação registrada no Redis para ${sender} - Câmbio: ${transmissionType}`);

    // Limpar contexto após um tempo
    setTimeout(() => userContext.delete(sender), 3600000); // 1 hora

  } catch (error) {
    logger.error(`Erro ao processar tipo de câmbio: ${error.message}`);
    await sock.sendMessage(sender, {
      text: '⚠️ Erro ao processar sua resposta. Tente novamente.'
    });
  }
}

function formatPlateDetails(data) {
  let message = `
📋 *INFORMAÇÕES DO VEÍCULO*

🏷️ Placa: ${data.plate}
🚗 Veículo: ${data.vehicle}
📅 Ano: ${data.year}
📄 Status: ${data.status}`;

  // Adicionar FIPE apenas se encontrado
  if (data.fipe !== 'N/A') {
    message += `
💰 FIPE: ${data.fipe}
📊 Referência FIPE: ${data.fipeReferencia || 'N/A'}`;
  }

  return message;
}

logger.info('🚀 Iniciando bot WhatsApp...');

// Inicializar Redis
logger.info('Inicializando Redis...');
await initRedis();
logger.info('Redis inicializado (ou falhando gracefully)');

// Conectar ao WhatsApp
logger.info('Chamando connectWhatsApp()...');
try {
  await connectWhatsApp();
  logger.info('✅ connectWhatsApp() completou');
} catch (err) {
  logger.error('❌ Erro em connectWhatsApp()');
  logger.error('Stack:', err?.stack || 'sem stack');
  logger.error('Message:', err?.message || 'sem mensagem');
  logger.error('Full error:', JSON.stringify(err));
  process.exit(1);
}

// Forçar reconexão a cada 2 minutos se não estiver conectado
setInterval(() => {
  if (!isConnected && sock) {
    logger.info('⚠️ Sem conexão. Forçando reconexão...');
    try {
      sock.ws?.close();
    } catch (e) {}
    connectWhatsApp().catch(err => logger.error('Erro na reconexão:', err));
  }
}, 120000);

process.on('SIGINT', async () => {
  logger.info('Encerrando...');
  await closeRedis();
  sock?.ws?.close();
  process.exit(0);
});
