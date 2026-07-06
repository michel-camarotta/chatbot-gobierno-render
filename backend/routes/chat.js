'use strict';

const express = require('express');
const { runChat } = require('./bots');

// POST /api/v1/chat (RF-01): atajo al bot por defecto de la plataforma.
// El endpoint canónico multi-bot es POST /api/v1/bots/:botId/chat.

function createChatRouter({ registry, defaultBotId }) {
  const router = express.Router();

  router.post('/', async (req, res, next) => {
    const entry = registry.get(defaultBotId);
    if (!entry) {
      return next(new Error(`bot por defecto "${defaultBotId}" no encontrado`));
    }
    try {
      await runChat(entry, req, res);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createChatRouter };
