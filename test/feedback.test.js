'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp, postJson } = require('./helpers');

// RF-05: feedback ciudadano.

describe('POST /api/v1/feedback (RF-05)', () => {
  let app;
  before(async () => {
    app = await startApp();
  });
  after(() => app.close());

  test('registra feedback válido con 204', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/feedback`, {
      helpful: true,
      comment: 'Muy claro, gracias.',
    });
    assert.equal(res.status, 204);
  });

  test('acepta feedback sin comentario', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/feedback`, { helpful: false });
    assert.equal(res.status, 204);
  });

  test('rechaza helpful faltante o no booleano', async () => {
    for (const body of [{}, { helpful: 'si' }, { helpful: 1 }]) {
      const res = await postJson(`${app.baseUrl}/api/v1/feedback`, body);
      assert.equal(res.status, 400);
      assert.equal(res.json.error.code, 'VALIDATION_ERROR');
    }
  });

  test('rechaza comment de más de 500 caracteres', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/feedback`, {
      helpful: true,
      comment: 'x'.repeat(501),
    });
    assert.equal(res.status, 400);
  });
});
