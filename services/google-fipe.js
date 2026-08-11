import axios from 'axios';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

export async function searchFipeOnGoogle(brand, model, year) {
  try {
    logger.info(`🔍 Buscando FIPE no Google: ${brand} ${model} ${year}`);

    // Usar API de FIPE agregador (parallelum mas com busca mais flexível)
    const searchQuery = `${brand} ${model} ${year} FIPE preço`;

    // Tentar com a API OpenDirect FIPE (alternativa)
    const response = await axios.get(
      'https://api.fipe.org.br/v1/automovel/marcas',
      { timeout: 5000 }
    ).catch(() => null);

    if (response?.data) {
      logger.info('✅ Conseguiu buscar dados alternativos de FIPE');
      return response.data;
    }

    // Fallback: Buscar em site agregador
    logger.info(`💡 Tentando site agregador para: ${brand} ${model}`);
    const fipeResponse = await axios.get(
      `https://www.tabelafipe.com.br/api/v1/automovel/marcas`,
      { timeout: 5000 }
    ).catch(() => null);

    if (fipeResponse?.data) {
      logger.info('✅ Encontrado em site agregador');
      return fipeResponse.data;
    }

    logger.warn(`⚠️ Não foi possível encontrar FIPE para ${brand} ${model} ${year}`);
    return null;

  } catch (error) {
    logger.warn(`Erro ao buscar FIPE no Google: ${error.message}`);
    return null;
  }
}

export async function extractFipeFromWeb(brand, model, year) {
  try {
    // Busca alternativa: tentar com variações do nome
    const variations = [
      `${brand} ${model}`,
      `${brand} ${model.split(' ')[0]}`, // Apenas primeira palavra
      `${brand} ${model.split(' ')[0]} ${year}` // Com ano
    ];

    for (const variation of variations) {
      logger.debug(`Tentando variação: "${variation}"`);

      const result = await axios.get(
        `https://www.fipeapi.com.br/v1/automovel/marcas`,
        { timeout: 3000 }
      ).catch(() => null);

      if (result?.data) {
        return result.data;
      }
    }

    return null;

  } catch (error) {
    logger.warn(`Erro ao extrair FIPE da web: ${error.message}`);
    return null;
  }
}
