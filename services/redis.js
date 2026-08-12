import { createClient } from 'redis';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

let redisClient = null;

export async function initRedis() {
  try {
    redisClient = createClient({
      host: 'localhost',
      port: 6379,
      socket: {
        reconnectStrategy: () => null, // Não reconectar automaticamente
        connectTimeout: 2000 // Timeout de 2 segundos
      }
    });

    redisClient.on('error', (err) => {
      logger.warn(`⚠️ Redis error: ${err.message}`);
      logger.warn('💡 Continuando sem Redis...');
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis conectado!');
    });

    // Tentar conectar com timeout de 3 segundos
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    return true;

  } catch (error) {
    logger.warn(`⚠️ Redis não disponível: ${error.message}`);
    logger.warn('💡 Usando apenas memória (cache em RAM)');
    redisClient = null;
    return false;
  }
}

export async function saveConsultation(phone, plate, data, transmission) {
  try {
    if (!redisClient) return;

    const key = `consultation:${phone}:${plate}`;
    const value = {
      plate: plate,
      vehicle: data.vehicle,
      year: data.year,
      fipe: data.fipe,
      transmission: transmission,
      timestamp: new Date().toISOString()
    };

    // Salvar com TTL de 7 dias
    await redisClient.setEx(
      key,
      7 * 24 * 60 * 60,
      JSON.stringify(value)
    );

    logger.info(`✅ Consulta salva no Redis: ${phone} - ${plate}`);

  } catch (error) {
    logger.warn(`Erro ao salvar no Redis: ${error.message}`);
  }
}

export async function getConsultationHistory(phone, limit = 10) {
  try {
    if (!redisClient) return [];

    const pattern = `consultation:${phone}:*`;
    const keys = await redisClient.keys(pattern);

    const consultations = [];
    for (const key of keys.slice(-limit)) {
      const data = await redisClient.get(key);
      if (data) {
        consultations.push(JSON.parse(data));
      }
    }

    return consultations;

  } catch (error) {
    logger.warn(`Erro ao buscar histórico: ${error.message}`);
    return [];
  }
}

export async function saveUserContext(phone, context) {
  try {
    if (!redisClient) return;

    const key = `user:${phone}`;

    // Salvar com TTL de 1 hora
    await redisClient.setEx(
      key,
      60 * 60,
      JSON.stringify(context)
    );

    logger.debug(`✅ Contexto salvo: ${phone}`);

  } catch (error) {
    logger.warn(`Erro ao salvar contexto: ${error.message}`);
  }
}

export async function getUserContext(phone) {
  try {
    if (!redisClient) return null;

    const key = `user:${phone}`;
    const data = await redisClient.get(key);

    return data ? JSON.parse(data) : null;

  } catch (error) {
    logger.warn(`Erro ao buscar contexto: ${error.message}`);
    return null;
  }
}

export async function closeRedis() {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis desconectado');
    }
  } catch (error) {
    logger.warn(`Erro ao fechar Redis: ${error.message}`);
  }
}
