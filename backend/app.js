'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { loadBots } = require('./bots');
const { createProvider } = require('./providers');
const { createBotRegistry } = require('./services/botRegistry');
const { requestId } = require('./middleware/requestId');
const { notFoundHandler, errorHandler } = require('./middleware/errors');
const { createBotsRouter } = require('./routes/bots');
const { createChatRouter } = require('./routes/chat');
const { createFeedbackRouter } = require('./routes/feedback');
const { createHealthRouter } = require('./routes/health');
const { createLegacyRouter } = require('./routes/legacy');

// Factory de la aplicación (testeable con dependencias inyectadas).
function createApp(options = {}) {
  const config = options.config || loadConfig();
  const logger = options.logger || createLogger(config);
  const bots = options.bots || loadBots();
  const provider = options.provider !== undefined ? options.provider : createProvider(config, logger);

  const registry = createBotRegistry(bots, { provider, logger, topK: config.retrievalTopK });
  const defaultBotId = registry.has(config.defaultBot) ? config.defaultBot : bots[0].id;

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

  app.use(express.json({ limit: `${config.bodyLimitKb}kb` }));
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
          error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Esperá un momento e intentá nuevamente.' },
        });
      },
    });

  const chatLimiter = rateLimited(config.rateLimitChatMax);
  const apiLimiter = rateLimited(config.rateLimitApiMax);

  const isReady = () => bots.length > 0;

  app.use('/api/v1', createHealthRouter({ isReady }));
  // El chat (de cualquier bot y el atajo por defecto) usa el límite estricto;
  // la navegación del catálogo usa el límite general.
  app.use('/api/v1/chat', chatLimiter, createChatRouter({ registry, defaultBotId }));
  app.use('/api/v1/bots', (req, res, next) => {
    const isChat = req.method === 'POST' && /\/chat\/?$/.test(req.path);
    return (isChat ? chatLimiter : apiLimiter)(req, res, next);
  }, createBotsRouter({ registry }));
  app.use('/api/v1/feedback', apiLimiter, createFeedbackRouter());
  app.use('/ask', chatLimiter);
  app.use(createLegacyRouter({ registry, defaultBotId }));

  app.use(express.static(path.join(__dirname, '..', 'frontend')));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
