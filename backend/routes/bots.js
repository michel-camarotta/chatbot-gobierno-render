'use strict';

const express = require('express');
const { ApiError, badRequest } = require('../middleware/errors');
const { normalize } = require('../services/retrieval');

// Rutas de la plataforma multi-bot (RF-08, RF-09, RF-10).

const MESSAGE_MAX = 1000;
const HISTORY_MAX_ITEMS = 20;
const HISTORY_CONTENT_MAX = 2000;
const ROLES = new Set(['user', 'assistant']);

function validateChatBody(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw badRequest('El cuerpo debe ser un objeto JSON.');
  }
  const { message, history } = body;

  if (typeof message !== 'string') throw badRequest("El campo 'message' es requerido y debe ser un texto.");
  const trimmed = message.trim();
  if (trimmed.length === 0) throw badRequest("El campo 'message' no puede estar vacío.");
  if (trimmed.length > MESSAGE_MAX) throw badRequest(`El campo 'message' no puede superar los ${MESSAGE_MAX} caracteres.`);

  let cleanHistory = [];
  if (history !== undefined) {
    if (!Array.isArray(history) || history.length > HISTORY_MAX_ITEMS) {
      throw badRequest(`El campo 'history' debe ser una lista de hasta ${HISTORY_MAX_ITEMS} mensajes.`);
    }
    cleanHistory = history.map((item, i) => {
      if (
        typeof item !== 'object' || item === null || !ROLES.has(item.role) ||
        typeof item.content !== 'string' || item.content.length === 0 || item.content.length > HISTORY_CONTENT_MAX
      ) {
        throw badRequest(`history[${i}] es inválido: se espera { role: "user"|"assistant", content: texto de hasta ${HISTORY_CONTENT_MAX} caracteres }.`);
      }
      return { role: item.role, content: item.content };
    });
  }
  return { message: trimmed, history: cleanHistory };
}

async function runChat(entry, req, res) {
  const { message, history } = validateChatBody(req.body);
  const started = Date.now();
  const result = await entry.orchestrator.handleChat({ message, history });

  // SEG-05: metadatos, no el contenido de la consulta (salvo en debug).
  req.log.info(
    {
      event: 'chat',
      bot: result.bot,
      mode: result.mode,
      agentes: result.agentes.map((a) => a.id),
      sources: result.sources.map((s) => s.id),
      latencyMs: Date.now() - started,
      messageLength: message.length,
    },
    'consulta respondida'
  );
  req.log.debug({ message }, 'contenido de la consulta');
  res.json(result);
}

function docSummary(doc) {
  return {
    id: doc.id,
    titulo: doc.titulo,
    coleccion: doc.coleccion,
    resumen: doc.resumen,
    etiquetas: doc.etiquetas,
  };
}

function createBotsRouter({ registry }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json({ bots: registry.list() });
  });

  router.get('/:botId', (req, res, next) => {
    const entry = registry.get(req.params.botId);
    if (!entry) return next(new ApiError(404, 'NOT_FOUND', 'No existe un bot con ese identificador.'));
    const { bot } = entry;
    res.json({
      id: bot.id,
      nombre: bot.nombre,
      descripcion: bot.descripcion,
      organismo: bot.organismo,
      saludo: bot.saludo || null,
      disclaimer: bot.disclaimer || null,
      agentes: bot.agentes.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        descripcion: a.descripcion,
        colecciones: a.colecciones,
      })),
      colecciones: [...new Set(bot.documents.map((d) => d.coleccion))],
    });
  });

  router.get('/:botId/documents', (req, res, next) => {
    const entry = registry.get(req.params.botId);
    if (!entry) return next(new ApiError(404, 'NOT_FOUND', 'No existe un bot con ese identificador.'));
    let docs = entry.bot.documents;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q) {
      const needle = normalize(q).trim();
      docs = docs.filter((doc) =>
        normalize([doc.titulo, doc.resumen, doc.coleccion, ...doc.etiquetas].join(' ')).includes(needle)
      );
    }
    res.json({ documents: docs.map(docSummary) });
  });

  router.get('/:botId/documents/:docId', (req, res, next) => {
    const entry = registry.get(req.params.botId);
    if (!entry) return next(new ApiError(404, 'NOT_FOUND', 'No existe un bot con ese identificador.'));
    const doc = entry.bot.documents.find((d) => d.id === req.params.docId);
    if (!doc) return next(new ApiError(404, 'NOT_FOUND', 'No existe un documento con ese identificador en este bot.'));
    res.json(doc);
  });

  router.post('/:botId/chat', async (req, res, next) => {
    const entry = registry.get(req.params.botId);
    if (!entry) return next(new ApiError(404, 'NOT_FOUND', 'No existe un bot con ese identificador.'));
    try {
      await runChat(entry, req, res);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createBotsRouter, validateChatBody, runChat };
