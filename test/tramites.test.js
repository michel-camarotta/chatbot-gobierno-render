'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp, catalog } = require('./helpers');

// RF-04: catálogo consultable por API.

describe('GET /api/v1/tramites (RF-04)', () => {
  let app;
  before(async () => {
    app = await startApp();
  });
  after(() => app.close());

  test('lista todos los trámites con los campos del resumen', async () => {
    const res = await fetch(`${app.baseUrl}/api/v1/tramites`);
    assert.equal(res.status, 200);
    const { tramites } = await res.json();
    assert.equal(tramites.length, catalog.length);
    for (const tramite of tramites) {
      assert.deepEqual(Object.keys(tramite).sort(), [
        'categoria',
        'descripcion',
        'id',
        'modalidad',
        'nombre',
      ]);
    }
  });

  test('filtra por texto con ?q= (insensible a tildes)', async () => {
    const res = await fetch(`${app.baseUrl}/api/v1/tramites?q=cedula`);
    const { tramites } = await res.json();
    assert.ok(tramites.length >= 2);
    assert.ok(tramites.every((t) => /c[eé]dula/i.test(JSON.stringify(t))));
  });

  test('devuelve la ficha completa por id', async () => {
    const res = await fetch(`${app.baseUrl}/api/v1/tramites/carne-de-salud`);
    assert.equal(res.status, 200);
    const tramite = await res.json();
    assert.equal(tramite.id, 'carne-de-salud');
    assert.ok(Array.isArray(tramite.requisitos));
    assert.ok(Array.isArray(tramite.pasos));
  });

  test('responde 404 con formato estándar para id inexistente', async () => {
    const res = await fetch(`${app.baseUrl}/api/v1/tramites/no-existe`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, 'NOT_FOUND');
  });
});
