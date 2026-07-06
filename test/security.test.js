'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { startApp, postJson } = require('./helpers');

// RNF-02 / SEG-01..03, SEG-07.

describe('seguridad (RNF-02)', () => {
  test('las respuestas llevan headers de seguridad y sin x-powered-by', async () => {
    const app = await startApp();
    try {
      const res = await fetch(`${app.baseUrl}/api/v1/health`);
      assert.equal(res.headers.get('x-powered-by'), null);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.ok(res.headers.get('content-security-policy').includes("default-src 'self'"));
    } finally {
      await app.close();
    }
  });

  test('rechaza payloads que superan el límite del cuerpo con 413 (SEG-01)', async () => {
    const app = await startApp();
    try {
      const res = await postJson(`${app.baseUrl}/api/v1/chat`, {
        message: 'hola',
        relleno: 'x'.repeat(70000),
      });
      assert.equal(res.status, 413);
      assert.equal(res.json.error.code, 'PAYLOAD_TOO_LARGE');
    } finally {
      await app.close();
    }
  });

  test('acepta un historial válido en su tamaño máximo sin 413', async () => {
    // 20 turnos de 2000 caracteres es un history válido según el contrato; el
    // límite del cuerpo debe acomodarlo (regresión del 413 con conversación larga).
    const app = await startApp();
    try {
      const history = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'x'.repeat(2000),
      }));
      const res = await postJson(`${app.baseUrl}/api/v1/chat`, { message: 'hola', history });
      assert.equal(res.status, 200);
    } finally {
      await app.close();
    }
  });

  test('limita solicitudes de chat por IP con 429 y Retry-After (SEG-02)', async () => {
    const app = await startApp({ config: { rateLimitChatMax: 3 } });
    try {
      const statuses = [];
      for (let i = 0; i < 5; i++) {
        const res = await postJson(`${app.baseUrl}/api/v1/chat`, { message: 'cédula' });
        statuses.push(res.status);
        if (res.status === 429) {
          assert.equal(res.json.error.code, 'RATE_LIMITED');
          assert.ok(Number(res.headers.get('retry-after')) > 0);
        }
      }
      assert.deepEqual(statuses.slice(0, 3), [200, 200, 200]);
      assert.ok(statuses.includes(429), 'la cuarta o quinta solicitud debe ser limitada');
    } finally {
      await app.close();
    }
  });

  test('los errores internos no filtran detalles (SEG-07)', async () => {
    const app = await startApp({
      provider: {
        name: 'roto',
        // Falla también el retrieval no: el provider lanza algo con stack.
        async generateReply() {
          throw new Error('detalle interno secreto: contraseña=hunter2');
        },
      },
    });
    try {
      // El proveedor falla → degrada a catálogo (RF-03); nunca 5xx ni detalles.
      const res = await postJson(`${app.baseUrl}/api/v1/chat`, { message: 'cédula' });
      assert.equal(res.status, 200);
      assert.ok(!JSON.stringify(res.json).includes('hunter2'));
    } finally {
      await app.close();
    }
  });

  test('404 de API con formato de error estándar', async () => {
    const app = await startApp();
    try {
      const res = await fetch(`${app.baseUrl}/api/v1/inexistente`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, 'NOT_FOUND');
    } finally {
      await app.close();
    }
  });
});
