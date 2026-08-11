import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

// Padrões de placa brasileira:
// Placa antiga: ABC1234 (3 letras + 4 números)
// Placa Mercosul: ABC1D23 (3 letras + 1 número + 1 letra + 2 números)

const PLATE_PATTERNS = [
  /\b[A-Z]{3}[-]?\d[A-Z]\d{2}\b/gi, // Mercosul: ABC-1D23
  /\b[A-Z]{3}[-]?\d{4}\b/gi          // Antiga: ABC-1234
];

export function extractPlateNumber(text) {
  if (!text) return null;

  // Limpar e normalizar texto
  const cleanText = text
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');

  // Procurar por padrões de placa
  for (const pattern of PLATE_PATTERNS) {
    const match = cleanText.match(pattern);
    if (match) {
      // Remover hífen se existir e converter para maiúscula
      const plate = match[0].replace('-', '').toUpperCase();
      logger.debug(`Placa extraída: ${plate}`);
      return plate;
    }
  }

  return null;
}

export function isValidPlate(plate) {
  if (!plate || plate.length < 7) return false;

  // Placa Mercosul: 8 caracteres (3 letras + 4 números/letras)
  if (plate.length === 8) {
    return /^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate);
  }

  // Placa antiga: 7 caracteres (3 letras + 4 números)
  if (plate.length === 7) {
    return /^[A-Z]{3}\d{4}$/.test(plate);
  }

  return false;
}

export function formatPlate(plate) {
  if (!plate) return null;

  const clean = plate.replace(/[^A-Z0-9]/g, '');

  // Formatar com hífen
  if (clean.length === 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  } else if (clean.length === 8) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }

  return clean;
}
