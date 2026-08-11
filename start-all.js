import { spawn } from 'child_process';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

logger.info('🚀 Iniciando WhatsApp Bot + Dashboard profissional...\n');

// Iniciar bot principal
const botProcess = spawn('node', ['index.js'], {
  stdio: 'inherit',
  shell: true
});

// Aguardar 2 segundos antes de iniciar dashboard
setTimeout(() => {
  // Iniciar servidor QR profissional
  const qrProcess = spawn('node', ['qr-server-pro.js'], {
    stdio: 'inherit',
    shell: true
  });

  qrProcess.on('error', (err) => {
    logger.error('Erro ao iniciar dashboard:', err);
  });

  qrProcess.on('exit', (code) => {
    logger.warn(`Dashboard encerrou com código ${code}`);
  });
}, 2000);

botProcess.on('error', (err) => {
  logger.error('Erro ao iniciar bot:', err);
  process.exit(1);
});

botProcess.on('exit', (code) => {
  logger.warn(`Bot encerrou com código ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('\nEncerrando...');
  botProcess.kill();
  process.exit(0);
});
