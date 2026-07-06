'use strict';

const express = require('express');
const { ApiError } = require('../middleware/errors');
const { normalize } = require('../services/retrieval');

// GET /api/v1/tramites y /api/v1/tramites/:id (RF-04).

function toSummary(tramite) {
  return {
    id: tramite.id,
    nombre: tramite.nombre,
    descripcion: tramite.descripcion,
    categoria: tramite.categoria,
    modalidad: tramite.modalidad,
  };
}

function createTramitesRouter({ catalog }) {
  const router = express.Router();
  const byId = new Map(catalog.map((tramite) => [tramite.id, tramite]));

  router.get('/', (req, res) => {
    let tramites = catalog;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q) {
      const needle = normalize(q).trim();
      tramites = catalog.filter((tramite) => {
        const haystack = normalize(
          [tramite.nombre, tramite.descripcion, tramite.categoria, ...tramite.palabrasClave].join(' ')
        );
        return haystack.includes(needle);
      });
    }
    res.json({ tramites: tramites.map(toSummary) });
  });

  router.get('/:id', (req, res, next) => {
    const tramite = byId.get(req.params.id);
    if (!tramite) {
      next(new ApiError(404, 'NOT_FOUND', 'No existe un trámite con ese identificador.'));
      return;
    }
    res.json(tramite);
  });

  return router;
}

module.exports = { createTramitesRouter };
