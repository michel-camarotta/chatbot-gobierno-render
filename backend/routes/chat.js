'use strict';

const express = require('express');
const { badRequest } = require('../middleware/errors');

// POST /api/v1/chat (RF-01). Validación estricta de entrada (SEG-01).

const MESSAGE_MAX = 1000;
const HISTORY_MAX_ITEMS = 20;
const HISTORY_CONTENT_MAX = 2000;
const ROLES = new Set(['user', 'assistant']);

function validateChatBody(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw badRequest('El cuerpo debe ser un objeto JSON.');
  }

  const { message, history } = body;

  if (typeof message !== 'string') {
    throw badRequest("El campo 'message' es requerido y debe ser un texto.");
  }
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    throw badRequest("El campo 'message' no puede estar vacío.");
  }
  if (trimmed.length > MESSAGE_MAX) {
    throw badRequest(`El campo 'message' no puede superar los ${MESSAGE_MAX} caracteres.`);
  }

  let cleanHistory = [];
  if (history !== undefined) {
    if (!Array.isArray(history) || history.length > HISTORY_MAX_ITEMS) {
      throw badRequest(`El campo 'history' debe ser una lista de hasta ${HISTORY_MAX_ITEMS} mensajes.`);
    }
    cleanHistory = history.map((item, i) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        !ROLES.has(item.role) ||
        typeof item.content !== 'string' ||
        item.content.length === 0 ||
        item.content.length > HISTORY_CONTENT_MAX
      ) {
        throw badRequest(
          `history[${i}] es inválido: se espera { role: "user"|"assistant", content: texto de hasta ${HISTORY_CONTENT_MAX} caracteres }.`
        );
      }
      return { role: item.role, content: item.content };
    });
  }

  return { message: trimmed, history: cleanHistory };
}

function createChatRouter({ chatService }) {
  const router = express.Router();

  router.post('/', async (req, res, next) => {
    try {
      const { message, history } = validateChatBody(req.body);
      const started = Date.now();
      const result = await chatService.handleChat({ message, history });

      // SEG-05: metadatos sí, contenido del mensaje no (solo en debug).
      req.log.info(
        {
          event: 'chat',
          mode: result.mode,
          sources: result.sources.map((s) => s.id),
          latencyMs: Date.now() - started,
          messageLength: message.length,
          historyLength: history.length,
        },
        'consulta respondida'
      );
      req.log.debug({ message }, 'contenido de la consulta');

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createChatRouter, validateChatBody };
