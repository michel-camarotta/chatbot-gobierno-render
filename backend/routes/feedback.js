'use strict';

const express = require('express');
const { badRequest } = require('../middleware/errors');

// POST /api/v1/feedback (RF-05): registro en log estructurado.
// En una fase futura puede persistirse en base de datos sin cambiar el contrato.

const COMMENT_MAX = 500;

function createFeedbackRouter() {
  const router = express.Router();

  router.post('/', (req, res, next) => {
    const body = req.body;
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      next(badRequest('El cuerpo debe ser un objeto JSON.'));
      return;
    }
    if (typeof body.helpful !== 'boolean') {
      next(badRequest("El campo 'helpful' es requerido y debe ser true o false."));
      return;
    }
    if (
      body.comment !== undefined &&
      (typeof body.comment !== 'string' || body.comment.length > COMMENT_MAX)
    ) {
      next(badRequest(`El campo 'comment' debe ser un texto de hasta ${COMMENT_MAX} caracteres.`));
      return;
    }

    req.log.info(
      { event: 'feedback', helpful: body.helpful, comment: body.comment || null },
      'feedback recibido'
    );
    res.status(204).end();
  });

  return router;
}

module.exports = { createFeedbackRouter };
