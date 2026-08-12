import { spawn } from 'child_process';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

logger.info('🚀 Iniciando WhatsApp Bot com Dashboard...\n');

// Iniciar servidor web (com Express)
const server = spawn('node', ['qr-server-pro.js'], {
  stdio: 'inherit',
  shell: true
});

// Aguardar 1 segundo para o servidor iniciar
setTimeout(() => {
  // Iniciar bot WhatsApp
  const bot = spawn('node', ['index.js'], {
    stdio: 'inherit',
    shell: true
  });

  bot.on('error', (err) => {
    logger.error('❌ Erro ao iniciar bot:', err);
  });

  bot.on('exit', (code) => {
    logger.warn(`⚠️ Bot encerrou com código ${code}`);
  });
}, 1000);

server.on('error', (err) => {
  logger.error('❌ Erro ao iniciar servidor:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  logger.warn(`⚠️ Servidor encerrou com código ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Encerrando gracefully...');
  server.kill();
  process.exit(0);
});
