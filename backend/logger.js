'use strict';

const pino = require('pino');

// Logs estructurados JSON, un evento por línea (RNF-03).
// Nunca registrar contenido de mensajes de ciudadanos en nivel info (SEG-05).
function createLogger(config) {
  return pino({
    level: config.logLevel,
    base: { service: 'asistente-ciudadano' },
    redact: { paths: ['req.headers.authorization'], remove: true },
  });
}

module.exports = { createLogger };
