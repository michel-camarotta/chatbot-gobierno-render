'use strict';

require('dotenv').config();

const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { loadBots } = require('./bots');
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

  let bots;
  try {
    bots = loadBots();
  } catch (err) {
    logger.fatal({ err: err.message }, 'no se pudieron cargar los bots');
    process.exit(1);
  }

  const app = createApp({ config, logger, bots });
  const totalDocs = bots.reduce((sum, b) => sum + b.documents.length, 0);
  const server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        bots: bots.map((b) => b.id),
        documentos: totalDocs,
        mode: config.openaiApiKey ? 'ai' : 'catalog',
      },
      'servicio iniciado'
    );
  });

  const shutdown = (signal) => {
    logger.info({ signal }, 'apagado graceful iniciado');
    server.close(() => {
      logger.info('conexiones cerradas, saliendo');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('timeout de apagado, salida forzada');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
