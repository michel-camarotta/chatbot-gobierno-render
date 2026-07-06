'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../backend/config');

// RNF-04: configuración validada con defaults seguros.

describe('configuración (RNF-04)', () => {
  test('sin variables aplica defaults seguros', () => {
    const config = loadConfig({});
    assert.equal(config.port, 3001);
    assert.equal(config.openaiApiKey, null);
    assert.equal(config.trustProxy, false);
    assert.deepEqual(config.corsOrigins, []);
    assert.equal(config.retrievalTopK, 4);
    assert.equal(config.defaultBot, 'canelones-tramites');
    assert.equal(config.rateLimitChatMax, 20);
  });

  test('parsea valores del entorno', () => {
    const config = loadConfig({
      PORT: '8080',
      OPENAI_API_KEY: 'sk-test',
      OPENAI_MODEL: 'gpt-4o',
      CORS_ORIGINS: 'https://www.imcanelones.gub.uy, https://tramites.gub.uy',
      TRUST_PROXY: 'true',
      RETRIEVAL_TOP_K: '5',
    });
    assert.equal(config.port, 8080);
    assert.equal(config.openaiApiKey, 'sk-test');
    assert.equal(config.openaiModel, 'gpt-4o');
    assert.deepEqual(config.corsOrigins, [
      'https://www.imcanelones.gub.uy',
      'https://tramites.gub.uy',
    ]);
    assert.equal(config.trustProxy, true);
    assert.equal(config.retrievalTopK, 5);
  });

  test('rechaza valores inválidos nombrando la variable', () => {
    assert.throws(() => loadConfig({ PORT: 'ochenta' }), /PORT/);
    assert.throws(() => loadConfig({ PORT: '99999' }), /PORT/);
    assert.throws(() => loadConfig({ TRUST_PROXY: 'quizás' }), /TRUST_PROXY/);
    assert.throws(() => loadConfig({ LOG_LEVEL: 'gritando' }), /LOG_LEVEL/);
    assert.throws(() => loadConfig({ CORS_ORIGINS: 'imcanelones.gub.uy' }), /CORS_ORIGINS/);
    assert.throws(() => loadConfig({ RETRIEVAL_TOP_K: '0' }), /RETRIEVAL_TOP_K/);
  });

  test('la configuración es inmutable', () => {
    const config = loadConfig({});
    assert.throws(() => {
      'use strict';
      config.port = 9999;
    }, TypeError);
  });
});
