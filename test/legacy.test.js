'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp, postJson } = require('./helpers');

// RF-07: alias deprecado /ask para integraciones de la PoC.

describe('POST /ask (RF-07)', () => {
  let app;
  before(async () => {
    app = await startApp();
  });
  after(() => app.close());

  test('mantiene el contrato { message } → { reply }', async () => {
    const res = await postJson(`${app.baseUrl}/ask`, { message: 'carné de salud' });
    assert.equal(res.status, 200);
    assert.equal(typeof res.json.reply, 'string');
    assert.match(res.json.reply, /Carné de salud/i);
    assert.equal(res.json.sources, undefined, 'el contrato legacy solo expone reply');
  });

  test('señala la deprecación con headers estándar', async () => {
    const res = await postJson(`${app.baseUrl}/ask`, { message: 'cédula' });
    assert.equal(res.headers.get('deprecation'), 'true');
    assert.match(res.headers.get('link'), /\/api\/v1\/chat/);
  });

  test('aplica la misma validación que el endpoint nuevo', async () => {
    const res = await postJson(`${app.baseUrl}/ask`, { message: '' });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, 'VALIDATION_ERROR');
  });
});
