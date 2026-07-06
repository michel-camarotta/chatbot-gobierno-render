'use strict';

const express = require('express');
const { version } = require('../../package.json');

// Healthchecks (RNF-03): liveness y readiness separados para orquestadores.

function createHealthRouter({ isReady }) {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', version });
  });

  router.get('/ready', (req, res) => {
    if (isReady()) {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not-ready' });
    }
  });

  return router;
}

module.exports = { createHealthRouter };
