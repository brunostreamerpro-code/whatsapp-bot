import dotenv from 'dotenv';
import { searchPlate } from './services/powercrm.js';
import { extractPlateNumber } from './utils/parser.js';
import pino from 'pino';

dotenv.config();

const logger = pino({ transport: { target: 'pino-pretty' } });

// Teste de extração de placa
console.log('\n🧪 TESTE 1: Extração de Placa\n');
const textos = [
  'Qual o status da placa ABC1234?',
  'Preciso saber sobre RUJ7I37',
  'Me diga da placa ABC-1D23 Mercosul',
  'Isso é um texto sem placa'
];

textos.forEach(texto => {
  const placa = extractPlateNumber(texto);
  console.log(`Texto: "${texto}"`);
  console.log(`Resultado: ${placa || 'Nenhuma placa encontrada'}\n`);
});

// Teste de API PowerCRM
console.log('\n🧪 TESTE 2: Integração PowerCRM\n');
console.log(`Token configurado: ${process.env.POWERCRM_BEARER_TOKEN ? '✅' : '❌'}`);
console.log(`API URL: ${process.env.POWERCRM_API_URL}\n`);

async function testAPI() {
  try {
    logger.info('Testando busca de placa RUJ7I37...');
    const result = await searchPlate('RUJ7I37');

    if (result) {
      console.log('✅ Placa encontrada:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('⚠️ Placa não encontrada no sistema');
    }
  } catch (error) {
    console.log(`❌ Erro ao consultar API: ${error.message}`);
    console.log('\n💡 Verifique:');
    console.log('   1. Token do PowerCRM está correto?');
    console.log('   2. Token expirou? (gere um novo)');
    console.log('   3. Você tem acesso a esta API?');
  }
}

testAPI();
