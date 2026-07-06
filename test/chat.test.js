'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp, postJson, fakeProvider, failingProvider } = require('./helpers');

// RF-01 (contrato y validación) y RF-03 (modo degradado).

describe('POST /api/v1/chat — modo catálogo (RF-03)', () => {
  let app;
  before(async () => {
    app = await startApp({ provider: null });
  });
  after(() => app.close());

  test('responde 200 con reply, sources y mode=catalog sin API key', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/chat`, {
      message: '¿Cómo hago la habilitación comercial?',
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.mode, 'catalog');
    assert.match(res.json.reply, /Habilitación comercial/i);
    assert.ok(
      res.json.sources.some((s) => s.id === 'habilitacion-comercial-tipo-b-canelones'),
      'la fuente esperada está presente'
    );
  });

  test('sin trámites relevantes deriva a canales oficiales sin inventar (RF-02)', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/chat`, {
      message: 'quiero adoptar un ornitorrinco radiactivo',
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.mode, 'catalog');
    assert.deepEqual(res.json.sources, []);
    assert.match(res.json.reply, /gub\.uy/);
    assert.match(res.json.reply, /No encontré/i);
  });

  test('rechaza message vacío con 400', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/chat`, { message: '   ' });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, 'VALIDATION_ERROR');
  });

  test('rechaza message no-string con 400', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/chat`, { message: 42 });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, 'VALIDATION_ERROR');
  });

  test('rechaza message de más de 1000 caracteres con 400', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/chat`, { message: 'a'.repeat(1001) });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, 'VALIDATION_ERROR');
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
      assert.equal(res.json.error.code, 'VALIDATION_ERROR');
    }
  });

  test('rechaza JSON inválido con 400 y formato de error estándar', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/chat`, '{no es json');
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, 'VALIDATION_ERROR');
  });
});

describe('POST /api/v1/chat — con proveedor de IA (RF-01, RF-03)', () => {
  test('responde mode=ai y pasa historial y contexto al proveedor', async () => {
    const provider = fakeProvider('Respuesta generada por el modelo.');
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
      assert.equal(res.json.reply, 'Respuesta generada por el modelo.');
      assert.ok(res.json.sources.length > 0);

      const call = provider.calls[0];
      // SEG-06: el prompt de sistema contiene solo los trámites recuperados.
      assert.match(call.system, /licencia-de-conducir-canelones/);
      assert.equal(call.messages.length, 3);
      assert.deepEqual(call.messages[2], {
        role: 'user',
        content: '¿Qué necesito para la licencia de conducir?',
      });
    } finally {
      await app.close();
    }
  });

  test('degrada a modo catálogo sin 5xx cuando el proveedor falla (RF-03)', async () => {
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
