import puppeteer from 'puppeteer';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const logger = pino({ transport: { target: 'pino-pretty' } });
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const USERNAME = 'comercial@superautoprotecaoveicular.com.br';
const PASSWORD = 'Jon102030.';

async function getTokenWithPuppeteer() {
  let browser;
  try {
    logger.info('🌐 Iniciando navegador automatizado...\n');

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    logger.info('📍 Acessando PowerCRM...');
    await page.goto('https://app.powercrm.com.br', { waitUntil: 'networkidle2' });

    logger.info('📝 Preenchendo formulário de login...');

    // Procurar pelo formulário
    const formExists = await page.$('form');
    if (!formExists) {
      logger.error('Formulário não encontrado. A página pode estar usando JavaScript para renderizar.');
      await page.screenshot({ path: 'debug.png' });
      logger.info('Screenshot salvo em: debug.png');
      return;
    }

    // Preencher username
    await page.type('input[name="j_username"]', USERNAME, { delay: 50 });

    // Preencher password
    await page.type('input[name="j_password"]', PASSWORD, { delay: 50 });

    logger.info('🔐 Enviando login...');

    // Pressionar Enter para submeter o formulário
    await page.keyboard.press('Enter');

    // Aguardar redirecionamento
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    } catch (e) {
      logger.info('⏳ Aguardando carregamento...');
      await page.waitForTimeout(3000);
    }

    logger.info('⏳ Aguardando carregamento da página...');
    await new Promise(r => setTimeout(r, 2000));

    // Pegar token do localStorage
    logger.info('🔍 Buscando token no localStorage...');

    const token = await page.evaluate(() => {
      return localStorage.getItem('@PowerCRM:token') ||
             localStorage.getItem('token') ||
             localStorage.getItem('powermobile_token');
    });

    if (!token) {
      logger.error('❌ Token não encontrado no localStorage');

      // Tentar extrair do window
      const allStorage = await page.evaluate(() => {
        let result = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          result[key] = localStorage.getItem(key);
        }
        return result;
      });

      logger.info('Conteúdo do localStorage:', allStorage);
      return;
    }

    logger.info('✅ Token encontrado!\n');

    // Atualizar .env
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    envContent = envContent.replace(
      /POWERCRM_BEARER_TOKEN=.*/,
      `POWERCRM_BEARER_TOKEN=${token}`
    );

    fs.writeFileSync(envPath, envContent);

    logger.info('✅ Arquivo .env atualizado!\n');
    logger.info('🎉 Token obtido com sucesso!\n');
    logger.info('Agora você pode rodar:\n  npm start\n');

  } catch (error) {
    logger.error(`Erro: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

getTokenWithPuppeteer();
