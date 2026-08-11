import axios from 'axios';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

const POWERCRM_URL = 'https://app.powercrm.com.br';

async function refreshSession() {
  try {
    logger.info('🔄 Tentando renovar sessão...\n');

    // Tentar fazer login automaticamente
    const loginResponse = await axios.post(`${POWERCRM_URL}/auth/login`, {
      username: process.env.POWERCRM_USERNAME || '',
      password: process.env.POWERCRM_PASSWORD || ''
    }, {
      timeout: 10000,
      validateStatus: () => true
    });

    if (loginResponse.status === 200) {
      const token = loginResponse.data.token;
      console.log('✅ Token renovado com sucesso!\n');
      console.log('Adicione isto ao seu .env:\n');
      console.log(`POWERCRM_BEARER_TOKEN=${token}\n`);
      return token;
    } else {
      logger.error('Falha ao fazer login. Resposta:', loginResponse.status);
    }

  } catch (error) {
    logger.error('Erro ao renovar token:', error.message);
    console.log('\n💡 Alternativa: Acesse https://app.powercrm.com.br e copie o token do localStorage:');
    console.log('1. Abra DevTools (F12)');
    console.log('2. Vá em Application → Local Storage → https://app.powercrm.com.br');
    console.log('3. Procure pela chave "token"');
    console.log('4. Copie o valor e atualize o .env');
  }
}

refreshSession();
