import axios from 'axios';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino({ transport: { target: 'pino-pretty' } });

const token = process.env.POWERCRM_BEARER_TOKEN;
console.log('\n📋 Token configurado:');
console.log(`Primeiros 50 chars: ${token.substring(0, 50)}...`);
console.log(`Comprimento total: ${token.length} caracteres\n`);

const client = axios.create({
  baseURL: 'https://app.powercrm.com.br',
  timeout: 10000
});

async function testVariants() {
  try {
    logger.info('🔍 Testando variantes de requisição...\n');

    // Teste 1: Com Bearer token simples
    logger.info('Teste 1: Bearer token simples');
    try {
      const r1 = await client.get('/company/pltVrfyQttn?plates=RUJ7I37', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      logger.info(`✅ Status: ${r1.status}`, r1.data);
    } catch (e) {
      logger.error(`❌ Status: ${e.response?.status}`);
    }

    // Teste 2: Com header customizado cmpid
    logger.info('\nTeste 2: Com cmpid header');
    try {
      const r2 = await client.get('/company/pltVrfyQttn?plates=RUJ7I37', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'cmpid': '1412',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      logger.info(`✅ Status: ${r2.status}`, r2.data);
    } catch (e) {
      logger.error(`❌ Status: ${e.response?.status}`);
      logger.error(`Response: ${e.response?.data}`);
    }

    // Teste 3: Sem Accept JSON
    logger.info('\nTeste 3: Sem Accept JSON (padrão navegador)');
    try {
      const r3 = await client.get('/company/pltVrfyQttn?plates=RUJ7I37', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*'
        }
      });
      logger.info(`✅ Status: ${r3.status}`);
      console.log(r3.data);
    } catch (e) {
      logger.error(`❌ Status: ${e.response?.status}`);
    }

  } catch (error) {
    logger.error(`Erro geral: ${error.message}`);
  }
}

testVariants();
