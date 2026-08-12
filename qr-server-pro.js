import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

let clients = [];
let connectionStatus = {
  connected: false,
  lastUpdate: new Date(),
  sessionFile: null
};

// Monitorar status de conexão pela sessão do WhatsApp (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  const sessionPath = path.join(__dirname, 'auth_info_baileys');
  const watcher = chokidar.watch(sessionPath, {
    persistent: true,
    ignoreInitial: true
  }).on('add', () => {
    connectionStatus.sessionFile = new Date();
    broadcastStatus();
  }).on('change', () => {
    connectionStatus.sessionFile = new Date();
    broadcastStatus();
  });
}

// Servir arquivos estáticos
app.use(express.static('.'));

// Server-Sent Events para atualizações em tempo real
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  clients.push(res);

  // Enviar status inicial
  res.write(`data: ${JSON.stringify(connectionStatus)}\n\n`);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

// Atualizar status
app.post('/api/status', (req, res) => {
  connectionStatus.connected = true;
  connectionStatus.lastUpdate = new Date();
  broadcastStatus();
  res.json({ ok: true });
});

// API para desconectar
app.post('/api/disconnect', (req, res) => {
  connectionStatus.connected = false;
  broadcastStatus();
  res.json({ ok: true });
});

// API para reconectar/gerar novo QR
app.post('/api/reconnect', (req, res) => {
  logger.info('🔄 Reconectando bot...');
  connectionStatus.connected = false;
  broadcastStatus();

  // Enviar sinal para reconectar (será ouvido pelo bot)
  try {
    fetch('http://localhost:3001/api/reconnect', { method: 'POST' }).catch(() => {});
  } catch (e) {}

  res.json({ ok: true, message: 'Reconexão iniciada' });
});

// API para notificar que QR code foi atualizado
app.post('/api/qr-updated', (req, res) => {
  logger.info('🔄 QR Code atualizado via bot!');
  clients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify({
        type: 'qr_update',
        timestamp: Date.now()
      })}\n\n`);
    } catch (e) {}
  });
  res.json({ ok: true });
});

// Monitorar QR Code (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  const qrWatcher = chokidar.watch('qrcode.png', {
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  qrWatcher.on('change', () => {
    logger.info('🔄 QR Code atualizado!');
    broadcastQrUpdate();
  });
}

function broadcastStatus() {
  clients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify({
        type: 'status',
        ...connectionStatus
      })}\n\n`);
    } catch (e) {
      // Cliente desconectado
    }
  });
}

function broadcastQrUpdate() {
  clients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify({
        type: 'qr_update',
        timestamp: Date.now()
      })}\n\n`);
    } catch (e) {
      // Cliente desconectado
    }
  });
}

// Página principal profissional
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WhatsApp Bot - Dashboard</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --primary: #25d366;
          --primary-dark: #1da851;
          --bg: #0a0e27;
          --bg-secondary: #111b3d;
          --text: #e0e0e0;
          --text-secondary: #b0b0b0;
          --border: #2a3a5a;
          --success: #25d366;
          --warning: #ff9800;
          --error: #f44336;
        }

        @media (prefers-color-scheme: light) {
          :root {
            --bg: #f5f7fa;
            --bg-secondary: #ffffff;
            --text: #1a1a1a;
            --text-secondary: #666666;
            --border: #e0e0e0;
          }
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border);
        }

        .header h1 {
          font-size: 32px;
          margin-bottom: 10px;
          background: linear-gradient(135deg, var(--primary) 0%, #34a853 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header p {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .status-bar {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 30px;
        }

        .status-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .status-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .status-icon.connected {
          background: rgba(37, 211, 102, 0.1);
          color: var(--success);
        }

        .status-icon.disconnected {
          background: rgba(244, 67, 54, 0.1);
          color: var(--error);
        }

        .status-content h3 {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 5px;
          font-weight: 500;
        }

        .status-content p {
          font-size: 16px;
          font-weight: 600;
        }

        .pulse {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .qr-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 30px;
          text-align: center;
        }

        .qr-title {
          margin-bottom: 20px;
          font-size: 18px;
          font-weight: 600;
        }

        #qrImage {
          max-width: 100%;
          width: 300px;
          height: auto;
          border-radius: 8px;
          background: white;
          padding: 10px;
          border: 2px solid var(--border);
          image-rendering: pixelated;
        }

        .qr-info {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
          font-size: 13px;
          color: var(--text-secondary);
        }

        .timestamp {
          margin-top: 20px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .loading {
          text-align: center;
          color: var(--text-secondary);
          padding: 20px;
        }

        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
          .status-bar {
            grid-template-columns: 1fr;
          }

          .header h1 {
            font-size: 24px;
          }

          #qrImage {
            width: 250px;
          }
        }

        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
          text-align: center;
          font-size: 12px;
          color: var(--text-secondary);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🤖 WhatsApp Bot</h1>
          <p>Dashboard de Conexão em Tempo Real</p>
        </div>

        <div class="status-bar">
          <div class="status-card">
            <div class="status-icon connected pulse" id="connectionIcon">
              ✓
            </div>
            <div class="status-content">
              <h3>Status de Conexão</h3>
              <p id="connectionStatus">Aguardando...</p>
            </div>
          </div>

          <div class="status-card">
            <div class="status-icon">
              ⏱️
            </div>
            <div class="status-content">
              <h3>Última Atualização</h3>
              <p id="lastUpdate">--:--:--</p>
            </div>
          </div>
        </div>

        <div class="qr-section">
          <div class="qr-title">📱 QR Code para Escanear</div>

          <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Gerando QR Code...</p>
          </div>

          <img id="qrImage" src="qrcode.png?t=${Date.now()}" alt="QR Code" style="display:none;">

          <div class="qr-info">
            <strong>Como conectar:</strong><br>
            1. Abra WhatsApp no celular<br>
            2. Configurações → Dispositivos vinculados<br>
            3. Escaneie o QR Code acima<br>
            4. Pronto! 🎉
            <br><br>
            <strong>❌ QR Code expirou?</strong><br>
            <button onclick="location.reload()" style="padding: 8px 16px; background: #25d366; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px; font-weight: bold;">Gerar Novo QR Code</button>
          </div>

          <div class="timestamp" id="timestamp">
            Última atualização: --:--:--
          </div>
        </div>

        <div class="footer">
          <p>Bot WhatsApp com PowerCRM e FIPE | Conectado via Render</p>
        </div>
      </div>

      <script>
        const qrImage = document.getElementById('qrImage');
        const loading = document.getElementById('loading');
        const connectionStatus = document.getElementById('connectionStatus');
        const lastUpdate = document.getElementById('lastUpdate');
        const connectionIcon = document.getElementById('connectionIcon');
        const timestamp = document.getElementById('timestamp');

        // Conectar ao SSE
        const eventSource = new EventSource('/events');

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.type === 'status') {
            updateStatus(data);
          } else if (data.type === 'qr_update') {
            updateQrCode();
          }
        };

        function updateStatus(data) {
          if (data.connected) {
            connectionStatus.textContent = '🟢 Conectado';
            connectionIcon.className = 'status-icon connected pulse';
            connectionIcon.textContent = '✓';
          } else {
            connectionStatus.textContent = '🔴 Desconectado';
            connectionIcon.className = 'status-icon disconnected';
            connectionIcon.textContent = '✕';
          }

          if (data.lastUpdate) {
            const date = new Date(data.lastUpdate);
            lastUpdate.textContent = date.toLocaleTimeString('pt-BR');
          }
        }

        function updateQrCode() {
          qrImage.src = 'qrcode.png?t=' + Date.now();
          qrImage.style.display = 'block';
          loading.style.display = 'none';
          timestamp.textContent = 'Última atualização: ' + new Date().toLocaleTimeString('pt-BR');
        }

        // Carregar QR inicial
        qrImage.onload = () => {
          loading.style.display = 'none';
          qrImage.style.display = 'block';
        };

        // Simular conexão após 5 segundos (será atualizado pelo bot real)
        setTimeout(() => {
          fetch('/api/status', { method: 'POST' });
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  logger.info(`\n🌐 Dashboard rodando em: http://localhost:${PORT}`);
  logger.info(`📱 Acesse: http://localhost:${PORT}`);
  logger.info(`⏳ Pressione Ctrl+C para parar\n`);
});
