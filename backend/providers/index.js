'use strict';

const { createOpenAiProvider } = require('./openaiProvider');

// Selección del proveedor de IA por configuración (ADR-04).
// Sin OPENAI_API_KEY el servicio opera en modo catálogo (RF-03).
function createProvider(config, logger) {
  if (!config.openaiApiKey) {
    logger.info('OPENAI_API_KEY no configurada: el asistente opera en modo catálogo');
    return null;
  }

  logger.info({ model: config.openaiModel }, 'proveedor de IA: openai');
  return createOpenAiProvider({
    apiKey: config.openaiApiKey,
    model: config.openaiModel,
    timeoutMs: config.openaiTimeoutMs,
  });
}

module.exports = { createProvider };
