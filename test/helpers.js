'use strict';

const { once } = require('events');
const { loadConfig } = require('../backend/config');
const { createLogger } = require('../backend/logger');
const { loadBots } = require('../backend/bots');
const { createApp } = require('../backend/app');

// La suite corre sin red ni claves (RNF-06): proveedor nulo (modo extractivo)
// o falso inyectado, y servidor en puerto efímero.

const bots = loadBots();
const DEFAULT_BOT = 'canelones-tramites';

async function startApp({ provider = null, config: overrides = {} } = {}) {
  const config = { ...loadConfig({}), logLevel: 'silent', ...overrides };
  const logger = createLogger(config);
  const app = createApp({ config, logger, provider, bots });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    /* respuesta no JSON */
  }
  return { status: res.status, headers: res.headers, json, text };
}

function fakeProvider(replyOrFn) {
  const calls = [];
  return {
    name: 'fake',
    calls,
    async generateReply(args) {
      calls.push(args);
      if (typeof replyOrFn === 'function') return replyOrFn(args);
      return replyOrFn;
    },
  };
}

function failingProvider() {
  return {
    name: 'failing',
    async generateReply() {
      throw new Error('proveedor caído');
    },
  };
}

function getBot(id) {
  return bots.find((b) => b.id === id);
}

module.exports = { startApp, postJson, fakeProvider, failingProvider, bots, getBot, DEFAULT_BOT };
