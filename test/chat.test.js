'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp, postJson, fakeProvider, failingProvider } = require('./helpers');

// RF-01 (contrato y validación) y RF-03/RF-11 (modo degradado extractivo)
// sobre el atajo al bot por defecto POST /api/v1/chat.

describe('POST /api/v1/chat — modo extractivo (RF-03, RF-11)', () => {
  let app;
  before(async () => {
    app = await startApp({ provider: null });
  });
  after(() => app.close());

  test('responde 200 con reply, sources, agentes y mode=catalog sin API key', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/chat`, {
      message: '¿Cómo hago la habilitación comercial?',
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.mode, 'catalog');
    assert.equal(res.json.bot, 'canelones-tramites');
    assert.match(res.json.reply, /Habilitación comercial/i);
    assert.ok(res.json.sources.some((s) => s.id === 'habilitacion-comercial-tipo-b'));
    assert.ok(res.json.agentes.some((a) => a.id === 'tramites'));
  });

  test('sin fragmentos relevantes deriva a canales oficiales sin inventar (RF-11)', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/chat`, {
      message: 'quiero adoptar un ornitorrinco radiactivo intergaláctico',
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.mode, 'catalog');
    assert.deepEqual(res.json.sources, []);
    assert.deepEqual(res.json.agentes, []);
    assert.match(res.json.reply, /No encontré/i);
  });

  test('rechaza message vacío, no-string o muy largo con 400', async () => {
    for (const message of ['   ', 42, 'a'.repeat(1001)]) {
      const res = await postJson(`${app.baseUrl}/api/v1/chat`, { message });
      assert.equal(res.status, 400);
      assert.equal(res.json.error.code, 'VALIDATION_ERROR');
    }
  });

  test('rechaza history malformado con 400', async () => {
    for (const history of [
      'no-una-lista',
      [{ role: 'hacker', content: 'x' }],
      [{ role: 'user' }],
      Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })),
    ]) {
      const res = await postJson(`${app.baseUrl}/api/v1/chat`, { message: 'hola', history });
      assert.equal(res.status, 400, `history inválido aceptado: ${JSON.stringify(history)}`);
    }
  });

  test('rechaza JSON inválido con 400', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/chat`, '{no es json');
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, 'VALIDATION_ERROR');
  });
});

describe('POST /api/v1/chat — con proveedor de IA (RF-10, RF-03)', () => {
  test('responde mode=ai y entrega al modelo solo fragmentos recuperados (RAG)', async () => {
    const provider = fakeProvider('Respuesta generada por el modelo. [1]');
    const app = await startApp({ provider });
    try {
      const res = await postJson(`${app.baseUrl}/api/v1/chat`, {
        message: '¿Qué necesito para la licencia de conducir?',
        history: [
          { role: 'user', content: 'hola' },
          { role: 'assistant', content: '¡Hola! ¿En qué te ayudo?' },
        ],
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.mode, 'ai');
      assert.equal(res.json.reply, 'Respuesta generada por el modelo. [1]');
      assert.ok(res.json.sources.some((s) => s.id === 'licencia-de-conducir'));

      const call = provider.calls[0];
      // SEG-06/RF-11: el sistema contiene el CONTEXTO recuperado y las reglas.
      assert.match(call.system, /Licencia de conducir/i);
      assert.match(call.system, /ÚNICAMENTE con la información del CONTEXTO/);
      assert.equal(call.messages.length, 3);
      assert.deepEqual(call.messages[2], {
        role: 'user',
        content: '¿Qué necesito para la licencia de conducir?',
      });
    } finally {
      await app.close();
    }
  });

  test('degrada a modo extractivo sin 5xx cuando el proveedor falla (RF-03)', async () => {
    const app = await startApp({ provider: failingProvider() });
    try {
      const res = await postJson(`${app.baseUrl}/api/v1/chat`, {
        message: '¿Cómo renuevo la cédula de identidad?',
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.mode, 'catalog');
      assert.match(res.json.reply, /Cédula de identidad/i);
    } finally {
      await app.close();
    }
  });
});
