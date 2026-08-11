import { textToSpeech } from 'google-tts-api';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { fileURLToPath } from 'url';

const logger = pino({ transport: { target: 'pino-pretty' } });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_FOLDER = process.env.AUDIO_FOLDER || './audios';

// Opção 1: Usar Google TTS (grátis, mas com limitações)
export async function generateAudio(plate, plateData) {
  try {
    const fileName = `${plate.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}.mp3`;
    const filePath = path.join(AUDIO_FOLDER, fileName);

    // Criar mensagem de voz
    const message = buildVoiceMessage(plateData);

    logger.info(`🎙️ Gerando áudio para placa: ${plate}`);

    // Usar Google TTS API
    const audioContent = await textToSpeech({
      text: message,
      lang: 'pt-BR',
      slow: false
    });

    // Salvar arquivo
    fs.writeFileSync(filePath, audioContent, 'binary');

    logger.info(`✅ Áudio salvo: ${filePath}`);

    return filePath;

  } catch (error) {
    logger.error(`Erro ao gerar áudio: ${error.message}`);
    // Fallback: retornar áudio genérico ou mensagem de erro
    throw error;
  }
}

function buildVoiceMessage(plateData) {
  return `
    Olá! Aqui estão as informações da placa consultada.

    Veículo: ${plateData.vehicle || 'não identificado'}.
    Ano de fabricação: ${plateData.year || 'não informado'}.
    Status do contrato: ${plateData.status || 'ativo'}.

    Para mais detalhes sobre o seguro, verifique os documentos enviados no chat.
    Obrigado!
  `;
}

// Opção 2: Usar áudio pré-gravado (recomendado)
export async function sendPrerecordedAudio(plate, audioName) {
  const prerecordedPath = path.join(AUDIO_FOLDER, 'prerecorded', `${audioName}.mp3`);

  if (!fs.existsSync(prerecordedPath)) {
    logger.warn(`Áudio pré-gravado não encontrado: ${audioName}`);
    return null;
  }

  return prerecordedPath;
}

// Criar pasta de áudios pré-gravados se não existir
export function initAudioFolder() {
  const prerecordedFolder = path.join(AUDIO_FOLDER, 'prerecorded');
  if (!fs.existsSync(prerecordedFolder)) {
    fs.mkdirSync(prerecordedFolder, { recursive: true });
    logger.info(`📁 Pasta de áudios criada: ${prerecordedFolder}`);
  }
}

initAudioFolder();
