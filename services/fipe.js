import axios from 'axios';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

// API FIPE gratuita
const FIPE_API = 'https://parallelum.com.br/fipe/api/v1';

export async function getFipeValue(brand, model, year) {
  try {
    if (!brand || !model || !year) {
      logger.debug('Faltam parâmetros para buscar FIPE');
      return null;
    }

    logger.debug(`🔍 Buscando FIPE: ${brand} ${model} ${year}`);

    // Step 1: Buscar marcas
    const brandsResp = await axios.get(`${FIPE_API}/carros/marcas`, {
      timeout: 5000
    });

    // Normalizar marca (remover acentos)
    const normalizeBrand = (str) => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // Remove diacríticos
        .trim();
    };

    const normalizedSearchBrand = normalizeBrand(brand);
    logger.debug(`Procurando por: "${brand}" (normalizado: "${normalizedSearchBrand}")`);

    // Buscar marca
    let brandData = brandsResp.data.find(b => {
      const normalizedName = normalizeBrand(b.nome);
      const match = normalizedName === normalizedSearchBrand ||
                    normalizedName.includes(normalizedSearchBrand) ||
                    normalizedSearchBrand.includes(normalizedName);
      return match;
    });

    if (!brandData) {
      logger.warn(`Marca não encontrada: ${brand}. Disponíveis: ${brandsResp.data.map(b => b.nome).slice(0, 5).join(', ')}`);
      return null;
    }

    logger.debug(`✅ Marca encontrada: ${brandData.nome}`);


    // Step 2: Buscar modelos
    const modelsResp = await axios.get(
      `${FIPE_API}/carros/marcas/${brandData.codigo}/modelos`,
      { timeout: 5000 }
    );

    // Busca flexível de modelo
    const normalizeModel = (str) => {
      return str
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim();
    };

    const normalizedSearchModel = normalizeModel(model);
    logger.debug(`Procurando modelo: "${model}" (normalizado: "${normalizedSearchModel}")`);

    let modelData = modelsResp.data.modelos.find(m => {
      const normalizedName = normalizeModel(m.nome);
      // Buscar por correspondência parcial (primeiras palavras)
      const searchWords = normalizedSearchModel.split(' ').filter(w => w.length > 2);
      return searchWords.every(word => normalizedName.includes(word));
    });

    if (!modelData) {
      // Tentar busca mais simples (apenas primeira palavra do modelo)
      const firstWord = normalizedSearchModel.split(' ')[0];
      modelData = modelsResp.data.modelos.find(m =>
        normalizeModel(m.nome).includes(firstWord)
      );
    }

    if (!modelData) {
      logger.warn(`⚠️ Modelo não encontrado: ${model}`);

      // Tentar busca com apenas a primeira palavra do modelo
      const firstWord = model.split(' ')[0];
      logger.info(`🔄 Tentando com primeira palavra: "${firstWord}"`);

      let alternativeModel = modelsResp.data.modelos.find(m =>
        normalizeModel(m.nome).startsWith(normalizeModel(firstWord))
      );

      if (!alternativeModel) {
        logger.warn(`Modelos disponíveis: ${modelsResp.data.modelos.map(m => m.nome).slice(0, 5).join(', ')}`);
        logger.warn(`💡 A FIPE pode não estar disponível para este veículo específico`);
        return null;
      }

      logger.info(`✅ Usando modelo alternativo: ${alternativeModel.nome}`);
      modelData = alternativeModel;
    }

    logger.debug(`✅ Modelo encontrado: ${modelData.nome}`);

    // Step 3: Buscar anos
    const yearsResp = await axios.get(
      `${FIPE_API}/carros/marcas/${brandData.codigo}/modelos/${modelData.codigo}/anos`,
      { timeout: 5000 }
    );

    const yearData = yearsResp.data.find(y =>
      y.nome.includes(year.toString())
    );

    if (!yearData) {
      logger.warn(`Ano não encontrado: ${year}`);
      return null;
    }

    // Step 4: Buscar valor FIPE
    const valueResp = await axios.get(
      `${FIPE_API}/carros/marcas/${brandData.codigo}/modelos/${modelData.codigo}/anos/${yearData.codigo}`,
      { timeout: 5000 }
    );

    const fipeValue = valueResp.data;

    logger.info(`✅ FIPE encontrada: R$ ${fipeValue.Valor}`);

    return {
      valor: fipeValue.Valor,
      referencia: fipeValue.MesReferencia,
      codigoFipe: fipeValue.CodigoFipe
    };

  } catch (error) {
    logger.warn(`Erro ao buscar FIPE: ${error.message}`);
    return null;
  }
}

export async function getFipeByCode(codFipe) {
  try {
    if (!codFipe) return null;

    logger.debug(`🔍 Buscando FIPE por código: ${codFipe}`);

    // Tentar buscar direto pela API usando o código FIPE
    // A API parallelum não suporta busca por código, então retornamos null
    // e deixamos para o usuário usar a função acima com marca/modelo/ano

    return null;

  } catch (error) {
    logger.warn(`Erro ao buscar FIPE por código: ${error.message}`);
    return null;
  }
}

// Função auxiliar para extrair marca e modelo da string de veículo
export function parseVehicleString(vehicleString) {
  if (!vehicleString) return null;

  // Exemplo: "CITROEN C4CACTUS FEEL AT"
  const parts = vehicleString.trim().split(/\s+/);

  if (parts.length < 2) return null;

  let brand = parts[0];  // CITROEN
  let model = parts.slice(1).join(' ');  // C4CACTUS FEEL AT

  // Tentar adicionar espaço entre números e letras no modelo
  // Ex: "C4CACTUS" -> "C4 CACTUS"
  model = model.replace(/(\d)([A-Z])/g, '$1 $2');

  return {
    brand: brand,
    model: model.trim()
  };
}
