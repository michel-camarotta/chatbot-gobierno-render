'use strict';

const express = require('express');
const { validateChatBody } = require('./bots');

// POST /ask (RF-07): alias deprecado del contrato de la PoC, sobre el bot por defecto.

function createLegacyRouter({ registry, defaultBotId }) {
  const router = express.Router();

  router.post('/ask', async (req, res, next) => {
    try {
      const { message } = validateChatBody(req.body);
      const entry = registry.get(defaultBotId);
      if (!entry) return next(new Error(`bot por defecto "${defaultBotId}" no encontrado`));
      const result = await entry.orchestrator.handleChat({ message });
      res.setHeader('Deprecation', 'true');
      res.setHeader('Link', '</api/v1/chat>; rel="successor-version"');
      res.json({ reply: result.reply });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createLegacyRouter };
