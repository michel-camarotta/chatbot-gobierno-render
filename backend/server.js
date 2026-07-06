'use strict';

require('dotenv').config();

const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { loadCatalog } = require('./catalog');
const { createApp } = require('./app');

// Bootstrap del servicio con apagado graceful (RNF-05).

function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const logger = createLogger(config);

  let catalog;
  try {
    catalog = loadCatalog();
  } catch (err) {
    logger.fatal({ err: err.message }, 'no se pudo cargar el catálogo de trámites');
    process.exit(1);
  }

  const app = createApp({ config, logger, catalog });
  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, tramites: catalog.length, mode: config.openaiApiKey ? 'ai' : 'catalog' },
      'servicio iniciado'
    );
  });

  const shutdown = (signal) => {
    logger.info({ signal }, 'apagado graceful iniciado');
    server.close(() => {
      logger.info('conexiones cerradas, saliendo');
      process.exit(0);
    });
    // Si las conexiones no drenan a tiempo, salir igual.
    setTimeout(() => {
      logger.warn('timeout de apagado, salida forzada');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
