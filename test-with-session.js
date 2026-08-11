import axios from 'axios';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

const POWERCRM_URL = 'https://app.powercrm.com.br';
const USERNAME = 'comercial@superautoprotecaoveicular.com.br';
const PASSWORD = 'Jon102030.';

// Usar CookieJar para manter sessão entre requisições
const client = axios.create({
  baseURL: POWERCRM_URL,
  validateStatus: () => true,
  timeout: 10000,
  withCredentials: true
});

async function testWithSession() {
  try {
    logger.info('🔐 Step 1: Fazendo login...\n');

    // Login
    const loginResp = await client.post('/j_spring_security_check',
      `j_username=${encodeURIComponent(USERNAME)}&j_password=${encodeURIComponent(PASSWORD)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    logger.info(`Status: ${loginResp.status}`);
    const sessionCookie = loginResp.headers['set-cookie']?.[0];

    if (!sessionCookie) {
      logger.error('Erro: Não foi possível extrair cookie de sessão');
      return;
    }

    logger.info(`✅ Sessão obtida\n`);

    // Usar o cookie para fazer requisição autenticada
    logger.info('🔍 Step 2: Testando busca de placa com sessão autenticada...\n');

    const plateResp = await client.get('/company/pltVrfyQttn', {
      params: { plates: 'RUJ7I37' },
      headers: {
        'Cookie': sessionCookie,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    logger.info(`Status da requisição: ${plateResp.status}`);

    if (plateResp.status === 200 && plateResp.data) {
      logger.info('✅ SUCESSO! API está respondendo!\n');
      console.log('Dados recebidos:');
      console.log(JSON.stringify(plateResp.data, null, 2));

      // Se chegou aqui, a sessão está funcionando!
      logger.info('\n🎉 Sessão autenticada funcionando!');
      logger.info('Você pode usar este método para autenticar o bot');

    } else {
      logger.error(`Erro: ${plateResp.status}`);
      logger.info('Resposta:', plateResp.data);
    }

  } catch (error) {
    logger.error(`Erro: ${error.message}`);
  }
}

testWithSession();
