'use strict';

// Carga y validación de configuración por variables de entorno (RNF-04).
// Toda opción tiene un valor por defecto seguro; los valores inválidos
// impiden el arranque con un mensaje que nombra la variable ofensora.

function parseIntStrict(env, name, defaultValue, { min = 1, max = Infinity } = {}) {
  const raw = env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      `Configuración inválida: ${name}="${raw}" debe ser un entero entre ${min} y ${max}.`
    );
  }
  return value;
}

function parseBool(env, name, defaultValue) {
  const raw = env[name];
  if (raw === undefined || raw === '') return defaultValue;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  throw new Error(`Configuración inválida: ${name}="${raw}" debe ser true o false.`);
}

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

function loadConfig(env = process.env) {
  const logLevel = env.LOG_LEVEL || 'info';
  if (!LOG_LEVELS.includes(logLevel)) {
    throw new Error(
      `Configuración inválida: LOG_LEVEL="${logLevel}" debe ser uno de ${LOG_LEVELS.join(', ')}.`
    );
  }

  const corsOrigins = (env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of corsOrigins) {
    if (!/^https?:\/\//.test(origin)) {
      throw new Error(
        `Configuración inválida: CORS_ORIGINS contiene "${origin}", los orígenes deben empezar con http:// o https://.`
      );
    }
  }

  return Object.freeze({
    nodeEnv: env.NODE_ENV || 'production',
    port: parseIntStrict(env, 'PORT', 3001, { min: 1, max: 65535 }),
    logLevel,
    trustProxy: parseBool(env, 'TRUST_PROXY', false),
    corsOrigins,

    openaiApiKey: env.OPENAI_API_KEY || null,
    openaiModel: env.OPENAI_MODEL || 'gpt-4o-mini',
    openaiTimeoutMs: parseIntStrict(env, 'OPENAI_TIMEOUT_MS', 15000, { min: 1000, max: 120000 }),

    retrievalTopK: parseIntStrict(env, 'RETRIEVAL_TOP_K', 3, { min: 1, max: 10 }),

    // Límite del cuerpo de la solicitud (SEG-01). El default acomoda el history
    // máximo válido (20 turnos × 2000 caracteres + mensaje + overhead JSON).
    bodyLimitKb: parseIntStrict(env, 'BODY_LIMIT_KB', 64, { min: 16, max: 512 }),

    rateLimitWindowMs: parseIntStrict(env, 'RATE_LIMIT_WINDOW_MS', 60000, { min: 1000 }),
    rateLimitChatMax: parseIntStrict(env, 'RATE_LIMIT_CHAT_MAX', 20),
    rateLimitApiMax: parseIntStrict(env, 'RATE_LIMIT_API_MAX', 100),
  });
}

module.exports = { loadConfig };
