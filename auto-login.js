import axios from 'axios';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const logger = pino({ transport: { target: 'pino-pretty' } });
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const POWERCRM_URL = 'https://app.powercrm.com.br';
const USERNAME = 'comercial@superautoprotecaoveicular.com.br';
const PASSWORD = process.env.POWERCRM_PASSWORD || 'Jon102030.';

const client = axios.create({
  baseURL: POWERCRM_URL,
  validateStatus: () => true,
  timeout: 10000
});

async function autoLogin() {
  try {
    logger.info('🔐 Fazendo login automaticamente...\n');

    // Step 1: Fazer login
    const loginResponse = await client.post('/j_spring_security_check',
      `j_username=${encodeURIComponent(USERNAME)}&j_password=${encodeURIComponent(PASSWORD)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    logger.info(`Login status: ${loginResponse.status}`);

    // Step 2: Extrair cookies da resposta
    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      logger.error('❌ Não foi possível extrair cookies. Verifique as credenciais.');
      return;
    }

    logger.info(`✅ Cookies recebidos: ${cookies.length} cookie(s)`);

    // Step 3: Fazer uma requisição autenticada para pegar o token
    const appResponse = await client.get('/company/pipeline', {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });

    // Step 4: Extrair token do HTML (está no localStorage)
    const tokenMatch = appResponse.data?.match(/localStorage\.setItem\('@PowerCRM:token',\s*"([^"]+)"\)/);

    if (!tokenMatch || !tokenMatch[1]) {
      logger.error('❌ Token não encontrado na página');
      logger.info('Alternativa: Tente acessar o site e pegue o token manualmente');
      return;
    }

    const newToken = tokenMatch[1];
    logger.info(`\n✅ Token obtido com sucesso!\n`);

    // Step 5: Atualizar .env
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Regex para encontrar a linha do token
    envContent = envContent.replace(
      /POWERCRM_BEARER_TOKEN=.*/,
      `POWERCRM_BEARER_TOKEN=${newToken}`
    );

    fs.writeFileSync(envPath, envContent);
    logger.info('✅ Arquivo .env atualizado com novo token!\n');

    console.log('🎉 Login automático bem-sucedido!');
    console.log('O bot está pronto para rodar:\n');
    console.log('  npm start\n');

  } catch (error) {
    logger.error(`Erro: ${error.message}`);
    console.log('\n💡 Dicas:');
    console.log('1. Verifique se as credenciais estão corretas');
    console.log('2. Tente acessar https://app.powercrm.com.br manualmente');
    console.log('3. Se 2FA está ativado, desative temporariamente');
  }
}

autoLogin();
