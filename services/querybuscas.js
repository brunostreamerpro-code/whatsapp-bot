import axios from 'axios';
import pino from 'pino';
import dotenv from 'dotenv';
import { getFipeValue, parseVehicleString } from './fipe.js';

dotenv.config();

const logger = pino({ transport: { target: 'pino-pretty' } });

const API_URL = process.env.QUERYBUSCAS_API_URL || 'https://querybuscas.com/api/consultas/placa';
const AUTH_TOKEN = process.env.QUERYBUSCAS_AUTH_TOKEN;

export async function searchPlate(plate) {
  try {
    if (!AUTH_TOKEN) {
      logger.error('❌ Token QueryBuscas não configurado');
      throw new Error('QUERYBUSCAS_AUTH_TOKEN não está definido');
    }

    logger.debug(`Buscando placa: ${plate} na API QueryBuscas`);

    const response = await axios.get(`${API_URL}/${plate.toUpperCase()}`, {
      headers: {
        'accept': '*/*',
        'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'sec-ch-ua': '"Chromium";v="119", "Not?A_Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'Referer': 'https://querybuscas.com/pages/consultas/Placa',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cookie': `auth_token=${AUTH_TOKEN}`
      },
      timeout: 10000
    });

    if (response.status === 200 && response.data) {
      const data = response.data;

      // Tentar buscar FIPE
      let fipeData = null;
      if (data.marca && data.modelo && data.ano) {
        try {
          const year = data.ano.toString().split('/')[0];
          logger.debug(`Buscando FIPE: ${data.marca} ${data.modelo} ${year}`);
          fipeData = await getFipeValue(data.marca, data.modelo, year);
          logger.debug(`FIPE resultado: ${JSON.stringify(fipeData)}`);
        } catch (fipeError) {
          logger.warn(`Erro ao buscar FIPE: ${fipeError.message}`);
        }
      }

      return {
        plate: plate.toUpperCase(),
        vehicle: `${data.marca || ''} ${data.modelo || ''}`.trim() || 'N/A',
        year: data.ano || 'N/A',
        status: 'Ativo',
        owner: data.proprietario || 'N/A',
        fipe: fipeData?.valor || 'N/A',
        fipeReferencia: fipeData?.referencia || 'N/A',
        codFipe: fipeData?.codigoFipe || 'N/A',
        rawData: data
      };
    }

    return null;

  } catch (error) {
    if (error.response?.status === 401) {
      logger.error('❌ Token QueryBuscas inválido ou expirado');
      logger.error('Resposta:', error.response?.data);
    } else if (error.response?.status === 404) {
      logger.warn(`Placa não encontrada: ${plate}`);
      return null;
    } else {
      logger.error(`Erro ao buscar placa: ${error.message}`);
      if (error.response?.status) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Dados: ${JSON.stringify(error.response.data)}`);
      }
    }
    return null;
  }
}
