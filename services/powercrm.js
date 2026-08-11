import axios from 'axios';
import pino from 'pino';
import dotenv from 'dotenv';
import { getFipeValue, parseVehicleString } from './fipe.js';

dotenv.config();

const logger = pino({ transport: { target: 'pino-pretty' } });

const POWERCRM_API_URL = process.env.POWERCRM_API_URL || 'https://app.powercrm.com.br';
const BEARER_TOKEN = process.env.POWERCRM_BEARER_TOKEN;

export async function searchPlate(plate) {
  try {
    if (!BEARER_TOKEN) {
      logger.error('❌ Token PowerCRM não configurado');
      throw new Error('POWERCRM_BEARER_TOKEN não está definido');
    }

    logger.debug(`Buscando placa: ${plate} na API PowerCRM`);

    // Fazer requisição com axios direto (sem client persistente)
    const response = await axios.get(`${POWERCRM_API_URL}/company/pltVrfyQttn`, {
      params: {
        plates: plate.toUpperCase()
      },
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Accept': '*/*'
      },
      timeout: 10000
    });

    // Verificar se a resposta tem dados
    if (response.status === 200 && response.data) {
      // Se é um objeto direto (com mensagem e dados de placa)
      if (response.data.mensagem === 'ok' || response.data.brand) {
        // Tentar buscar FIPE
        let fipeData = null;
        if (response.data.brand && response.data.year) {
          const parsed = parseVehicleString(response.data.brand);
          logger.debug(`Parsed: ${JSON.stringify(parsed)}`);
          if (parsed) {
            const year = response.data.year.split('/')[0]; // "2022/2022" -> "2022"
            logger.debug(`Buscando FIPE: ${parsed.brand} ${parsed.model} ${year}`);
            try {
              fipeData = await getFipeValue(parsed.brand, parsed.model, year);
              logger.debug(`FIPE resultado: ${JSON.stringify(fipeData)}`);
            } catch (fipeError) {
              logger.warn(`Erro ao buscar FIPE: ${fipeError.message}`);
            }
          }
        }

        return {
          plate: plate.toUpperCase(),
          vehicle: response.data.brand || 'N/A',
          year: response.data.year || 'N/A',
          status: 'Ativo',
          owner: 'N/A',
          fipe: fipeData?.valor || 'N/A',
          fipeReferencia: fipeData?.referencia || 'N/A',
          codFipe: response.data.codFipe || 'N/A',
          rawData: response.data
        };
      }

      // Se é um array
      if (Array.isArray(response.data) && response.data.length > 0) {
        const data = response.data[0];
        return {
          plate: data.plate || plate,
          vehicle: data.vehicle || data.model || 'N/A',
          year: data.year || data.fabricationYear || 'N/A',
          contract: data.contract || data.quotation || 'N/A',
          status: data.status || 'Ativo',
          owner: data.owner || 'N/A',
          rawData: data
        };
      }
    }

    return null;

  } catch (error) {
    if (error.response?.status === 401) {
      logger.error('❌ Token de autorização inválido ou expirado');
      logger.info('Execute: node get-token-puppeteer.js');
    } else if (error.response?.status === 404) {
      logger.warn(`Placa não encontrada: ${plate}`);
      return null;
    } else {
      logger.error(`Erro ao buscar placa: ${error.message}`);
    }
    throw error;
  }
}

export async function getContractDetails(contractId) {
  try {
    logger.debug(`Buscando detalhes do contrato: ${contractId}`);

    const response = await axios.get(`${POWERCRM_API_URL}/contract/${contractId}`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Accept': '*/*'
      },
      timeout: 10000
    });

    return response.data || null;

  } catch (error) {
    logger.error(`Erro ao buscar contrato: ${error.message}`);
    return null;
  }
}

export async function searchByVehicle(vehicle) {
  try {
    logger.debug(`Buscando veículo: ${vehicle}`);

    const response = await axios.get(`${POWERCRM_API_URL}/search/vehicle`, {
      params: { query: vehicle },
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Accept': '*/*'
      },
      timeout: 10000
    });

    return response.data || [];

  } catch (error) {
    logger.error(`Erro ao buscar veículo: ${error.message}`);
    return [];
  }
}
