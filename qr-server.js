import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

let clients = [];

// Servir arquivos estáticos
app.use(express.static('.'));

// Server-Sent Events para atualização em tempo real
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

// Monitorar mudanças no arquivo QR
const watcher = chokidar.watch('qrcode.png', {
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100
  }
});

watcher.on('change', () => {
  logger.info('🔄 QR Code atualizado!');
  // Enviar evento para todos os clientes
  clients.forEach(client => {
    client.write(`data: ${Date.now()}\n\n`);
  });
});

// Página principal
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WhatsApp Bot - QR Code</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 40px;
          max-width: 500px;
          width: 100%;
          text-align: center;
        }

        h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 28px;
        }

        .status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 30px;
          font-size: 16px;
          color: #666;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #4CAF50;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .qr-container {
          background: #f5f5f5;
          border-radius: 15px;
          padding: 20px;
          margin: 30px 0;
          border: 2px dashed #ddd;
          position: relative;
        }

        #qrImage {
          width: 100%;
          max-width: 350px;
          height: auto;
          border-radius: 10px;
          background: white;
          padding: 10px;
          border: 2px solid #eee;
        }

        .loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 14px;
          color: #999;
        }

        .instructions {
          background: #e3f2fd;
          border-left: 4px solid #2196F3;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          text-align: left;
          font-size: 14px;
          color: #1565c0;
        }

        .instructions h3 {
          margin-bottom: 10px;
          color: #0d47a1;
        }

        .instructions ol {
          margin-left: 20px;
        }

        .instructions li {
          margin: 8px 0;
        }

        .timestamp {
          font-size: 12px;
          color: #999;
          margin-top: 20px;
        }

        .connection-status {
          margin-top: 20px;
          padding: 15px;
          border-radius: 5px;
          font-size: 14px;
        }

        .connected {
          background: #c8e6c9;
          color: #2e7d32;
        }

        .disconnected {
          background: #ffcdd2;
          color: #c62828;
        }

        @media (max-width: 600px) {
          .container {
            padding: 20px;
          }

          h1 {
            font-size: 24px;
          }

          .instructions {
            font-size: 13px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 WhatsApp Bot</h1>

        <div class="status">
          <span class="status-dot"></span>
          <span>Aguardando conexão...</span>
        </div>

        <div class="qr-container">
          <img id="qrImage" src="qrcode.png?t=${Date.now()}" alt="QR Code">
          <div class="loading" id="loading">Gerando QR Code...</div>
        </div>

        <div class="instructions">
          <h3>📱 Como conectar:</h3>
          <ol>
            <li>Abra o <strong>WhatsApp</strong> no seu celular</li>
            <li>Vá em <strong>Configurações → Dispositivos vinculados</strong></li>
            <li>Toque em <strong>Vincular um dispositivo</strong></li>
            <li><strong>Escaneie o QR Code</strong> acima</li>
            <li>Pronto! O bot está conectado 🎉</li>
          </ol>
        </div>

        <div class="connection-status disconnected" id="connectionStatus">
          ❌ Aguardando conexão WhatsApp...
        </div>

        <div class="timestamp" id="timestamp">
          Última atualização: -
        </div>
      </div>

      <script>
        // Conectar ao Server-Sent Events
        const eventSource = new EventSource('/events');

        eventSource.onmessage = (event) => {
          console.log('QR Code atualizado!');

          // Atualizar imagem do QR Code
          const qrImage = document.getElementById('qrImage');
          const timestamp = new Date().toLocaleTimeString('pt-BR');

          qrImage.src = 'qrcode.png?t=' + Date.now();
          document.getElementById('timestamp').textContent = 'Última atualização: ' + timestamp;
        };

        eventSource.onerror = () => {
          console.error('Erro na conexão SSE');
          eventSource.close();
        };

        // Carregar imagem inicial
        const qrImage = document.getElementById('qrImage');
        qrImage.onload = () => {
          document.getElementById('loading').style.display = 'none';
        };

        qrImage.onerror = () => {
          document.getElementById('loading').textContent = 'QR Code não encontrado. Verifique se o bot está rodando.';
        };

        // Simular conexão após 30 segundos (para demonstração)
        // Em produção, isso viria do bot
        setTimeout(() => {
          document.getElementById('connectionStatus').classList.remove('disconnected');
          document.getElementById('connectionStatus').classList.add('connected');
          document.getElementById('connectionStatus').textContent = '✅ Bot conectado ao WhatsApp!';
        }, 30000);
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  logger.info(`\n🌐 Servidor QR Code rodando em: http://localhost:${PORT}`);
  logger.info(`📱 Abra no navegador: http://localhost:${PORT}\n`);
  logger.info('⏳ Pressione Ctrl+C para parar\n');
});
