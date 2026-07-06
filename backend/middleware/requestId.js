'use strict';

const crypto = require('crypto');

// Trazabilidad de solicitudes (RNF-03): toda respuesta lleva X-Request-Id,
// reutilizando el del cliente si tiene un formato seguro.
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

function requestId(logger) {
  return (req, res, next) => {
    const incoming = req.get('X-Request-Id');
    const id = incoming && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
    req.id = id;
    req.log = logger.child({ requestId: id });
    res.setHeader('X-Request-Id', id);
    next();
  };
}

module.exports = { requestId };
