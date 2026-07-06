'use strict';

// Formato de error uniforme (specs/03-api.md) y sin fuga de detalles internos (SEG-07).

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function badRequest(message) {
  return new ApiError(400, 'VALIDATION_ERROR', message);
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Recurso inexistente.' },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  // Errores del body parser de Express.
  if (err.type === 'entity.too.large') {
    res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo de la solicitud es demasiado grande.' },
    });
    return;
  }
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'El cuerpo de la solicitud no es JSON válido.' },
    });
    return;
  }

  const logger = req.log || console;
  logger.error({ err }, 'error no controlado');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno. Intentá nuevamente.' },
  });
}

module.exports = { ApiError, badRequest, notFoundHandler, errorHandler };
