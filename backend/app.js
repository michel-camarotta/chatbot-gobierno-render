'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { loadCatalog } = require('./catalog');
const { createProvider } = require('./providers');
const { createRetrieval } = require('./services/retrieval');
const { createChatService } = require('./services/chatService');
const { requestId } = require('./middleware/requestId');
const { notFoundHandler, errorHandler } = require('./middleware/errors');
const { createChatRouter } = require('./routes/chat');
const { createTramitesRouter } = require('./routes/tramites');
const { createFeedbackRouter } = require('./routes/feedback');
const { createHealthRouter } = require('./routes/health');
const { createLegacyRouter } = require('./routes/legacy');

// Factory de la aplicación (testeable con dependencias inyectadas).
function createApp(options = {}) {
  const config = options.config || loadConfig();
  const logger = options.logger || createLogger(config);
  const catalog = options.catalog || loadCatalog();
  const provider =
    options.provider !== undefined ? options.provider : createProvider(config, logger);

  const retrieval = createRetrieval(catalog, { topK: config.retrievalTopK });
  const chatService = createChatService({ retrieval, provider, logger });

  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  // SEG-03: headers de seguridad con CSP restrictiva (solo recursos propios).
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'"],
        },
      },
    })
  );

  // SEG-03: CORS cerrado por defecto; solo orígenes configurados explícitamente.
  if (config.corsOrigins.length > 0) {
    app.use(cors({ origin: config.corsOrigins, methods: ['GET', 'POST'] }));
  }

  app.use(express.json({ limit: '32kb' }));
  app.use(requestId(logger));

  const rateLimited = (max) =>
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.setHeader('Retry-After', Math.ceil(config.rateLimitWindowMs / 1000));
        res.status(429).json({
          error: {
            code: 'RATE_LIMITED',
            message: 'Demasiadas solicitudes. Esperá un momento e intentá nuevamente.',
          },
        });
      },
    });

  const chatLimiter = rateLimited(config.rateLimitChatMax);
  const apiLimiter = rateLimited(config.rateLimitApiMax);

  app.use('/api/v1', createHealthRouter({ isReady: () => catalog.length > 0 }));
  app.use('/api/v1/chat', chatLimiter, createChatRouter({ chatService }));
  app.use('/api/v1/tramites', apiLimiter, createTramitesRouter({ catalog }));
  app.use('/api/v1/feedback', apiLimiter, createFeedbackRouter());
  app.use('/ask', chatLimiter);
  app.use(createLegacyRouter({ chatService }));

  app.use(express.static(path.join(__dirname, '..', 'frontend')));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
