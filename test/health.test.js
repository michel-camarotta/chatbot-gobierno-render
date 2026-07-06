'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp, postJson } = require('./helpers');

// RNF-03: observabilidad.

describe('healthchecks y trazabilidad (RNF-03)', () => {
  let app;
  before(async () => {
    app = await startApp();
  });
  after(() => app.close());

  test('GET /api/v1/health responde ok con versión', async () => {
    const res = await fetch(`${app.baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.match(body.version, /^\d+\.\d+\.\d+$/);
  });

  test('GET /api/v1/ready responde ready con catálogo cargado', async () => {
    const res = await fetch(`${app.baseUrl}/api/v1/ready`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ready');
  });

  test('toda respuesta lleva X-Request-Id generado', async () => {
    const res = await fetch(`${app.baseUrl}/api/v1/health`);
    assert.match(res.headers.get('x-request-id'), /^[A-Za-z0-9_-]{1,64}$/);
  });

  test('reutiliza el X-Request-Id del cliente si es seguro', async () => {
    const res = await postJson(
      `${app.baseUrl}/api/v1/feedback`,
      { helpful: true },
      { 'X-Request-Id': 'mi-id-de-cliente-123' }
    );
    assert.equal(res.headers.get('x-request-id'), 'mi-id-de-cliente-123');
  });

  test('descarta X-Request-Id con formato peligroso', async () => {
    const malicioso = 'id con espacios y <script>';
    const res = await fetch(`${app.baseUrl}/api/v1/health`, {
      headers: { 'X-Request-Id': malicioso },
    });
    const id = res.headers.get('x-request-id');
    assert.notEqual(id, malicioso);
    assert.match(id, /^[A-Za-z0-9_-]{1,64}$/);
  });
});
