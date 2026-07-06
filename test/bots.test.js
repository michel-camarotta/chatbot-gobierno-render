'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp, postJson, bots } = require('./helpers');
const { createApp } = require('../backend/app');
const { loadConfig } = require('../backend/config');
const { createLogger } = require('../backend/logger');

// RF-08: plataforma multi-bot por API.

describe('bot por defecto (RF-08)', () => {
  function appWith(defaultBot) {
    const config = { ...loadConfig({}), logLevel: 'silent', defaultBot };
    return () => createApp({ config, logger: createLogger(config), provider: null, bots });
  }

  test('el arranque falla si DEFAULT_BOT no coincide con ningún bot', () => {
    assert.throws(appWith('no-existe'), /DEFAULT_BOT/);
  });

  test('el arranque funciona con un DEFAULT_BOT válido', () => {
    assert.doesNotThrow(appWith('mgap-ganado'));
  });
});

describe('API multi-bot (RF-08)', () => {
  let app;
  before(async () => {
    app = await startApp();
  });
  after(() => app.close());

  test('GET /api/v1/bots lista los bots disponibles', async () => {
    const res = await fetch(`${app.baseUrl}/api/v1/bots`);
    assert.equal(res.status, 200);
    const { bots } = await res.json();
    const ids = bots.map((b) => b.id);
    assert.ok(ids.includes('canelones-tramites'));
    assert.ok(ids.includes('mgap-ganado'));
  });

  test('GET /api/v1/bots/:id devuelve detalle con agentes y colecciones', async () => {
    const res = await fetch(`${app.baseUrl}/api/v1/bots/mgap-ganado`);
    assert.equal(res.status, 200);
    const bot = await res.json();
    assert.equal(bot.organismo.includes('MGAP'), true);
    const agentes = bot.agentes.map((a) => a.id).sort();
    assert.deepEqual(agentes, ['controles', 'enfermedades', 'normativa', 'protocolos']);
    assert.ok(bot.colecciones.includes('enfermedades'));
  });

  test('bot inexistente responde 404', async () => {
    const res = await fetch(`${app.baseUrl}/api/v1/bots/no-existe`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, 'NOT_FOUND');
  });

  test('POST /api/v1/bots/:id/chat conversa con el bot indicado', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/bots/mgap-ganado/chat`, {
      message: '¿qué hago ante una muerte súbita sospechosa de carbunco?',
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.bot, 'mgap-ganado');
    assert.match(res.json.reply, /carbunco|cadáver/i);
    assert.ok(res.json.sources.length > 0);
  });

  test('POST a un bot inexistente responde 404', async () => {
    const res = await postJson(`${app.baseUrl}/api/v1/bots/no-existe/chat`, { message: 'hola' });
    assert.equal(res.status, 404);
  });

  test('GET /api/v1/bots/:id/documents lista y filtra la base de conocimiento', async () => {
    const todos = await (await fetch(`${app.baseUrl}/api/v1/bots/mgap-ganado/documents`)).json();
    assert.ok(todos.documents.length >= 13);

    const filtrado = await (
      await fetch(`${app.baseUrl}/api/v1/bots/mgap-ganado/documents?q=garrapata`)
    ).json();
    assert.ok(filtrado.documents.length >= 1);
    assert.ok(filtrado.documents.every((d) => /garrapata/i.test(JSON.stringify(d))));
  });

  test('GET /api/v1/bots/:id/documents/:docId devuelve la ficha completa o 404', async () => {
    const ok = await fetch(`${app.baseUrl}/api/v1/bots/mgap-ganado/documents/fiebre-aftosa`);
    assert.equal(ok.status, 200);
    const doc = await ok.json();
    assert.equal(doc.id, 'fiebre-aftosa');
    assert.ok(Array.isArray(doc.secciones));

    const notFound = await fetch(`${app.baseUrl}/api/v1/bots/mgap-ganado/documents/no-existe`);
    assert.equal(notFound.status, 404);
  });
});
