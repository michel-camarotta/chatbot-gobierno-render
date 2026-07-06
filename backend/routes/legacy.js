'use strict';

const express = require('express');
const { validateChatBody } = require('./chat');

// POST /ask (RF-07): alias deprecado del contrato de la PoC.
// Mantiene integraciones existentes mientras migran a /api/v1/chat.

function createLegacyRouter({ chatService }) {
  const router = express.Router();

  router.post('/ask', async (req, res, next) => {
    try {
      const { message } = validateChatBody(req.body);
      const result = await chatService.handleChat({ message });
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
