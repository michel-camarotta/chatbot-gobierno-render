'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createOrchestrator } = require('../backend/services/orchestrator');
const { getBot, fakeProvider, failingProvider } = require('./helpers');

const logger = { warn() {}, info() {}, debug() {} };

// RF-09 (orquestación por agentes) y RF-11 (anti-alucinación).

describe('orquestador (RF-09, RF-11)', () => {
  const ganado = getBot('mgap-ganado');

  test('rutea a los agentes pertinentes y los reporta', async () => {
    const orch = createOrchestrator(ganado, { provider: null, logger });
    const res = await orch.handleChat({ message: '¿a quién aviso si sospecho fiebre aftosa?' });
    const ids = res.agentes.map((a) => a.id);
    // La consulta es sobre aviso ante una enfermedad: participan protocolos y/o enfermedades.
    assert.ok(ids.includes('protocolos') || ids.includes('enfermedades'));
    assert.ok(res.sources.length > 0);
  });

  test('una consulta de trazabilidad activa el agente de normativa', async () => {
    const orch = createOrchestrator(ganado, { provider: null, logger });
    const res = await orch.handleChat({ message: '¿cómo saco la guía de tránsito para mover animales?' });
    assert.ok(res.agentes.some((a) => a.id === 'normativa'));
    assert.ok(res.sources.some((s) => s.id === 'guia-de-transito'));
  });

  test('sin coincidencias no inventa: deriva y no cita fuentes (RF-11)', async () => {
    const orch = createOrchestrator(ganado, { provider: null, logger });
    const res = await orch.handleChat({ message: 'recomendame una serie de televisión' });
    assert.deepEqual(res.sources, []);
    assert.deepEqual(res.agentes, []);
    assert.equal(res.mode, 'catalog');
    assert.match(res.reply, /No encontré/i);
  });

  test('modo extractivo: la respuesta se compone citando el conocimiento curado', async () => {
    const orch = createOrchestrator(ganado, { provider: null, logger });
    const res = await orch.handleChat({ message: 'signos de la brucelosis' });
    assert.equal(res.mode, 'catalog');
    assert.match(res.reply, /Brucelosis/i);
    assert.match(res.reply, /Fuente:/);
  });

  test('con proveedor: solo se le pasan fragmentos recuperados y responde mode=ai', async () => {
    const provider = fakeProvider(({ system }) => {
      // El contexto entregado no contiene documentos ajenos a la consulta.
      assert.match(system, /<<CONTEXTO>>/);
      assert.doesNotMatch(system, /Habilitación comercial/);
      return 'respuesta IA [1]';
    });
    const orch = createOrchestrator(ganado, { provider, logger });
    const res = await orch.handleChat({ message: '¿cuándo es la vacunación antiaftosa?' });
    assert.equal(res.mode, 'ai');
    assert.equal(res.reply, 'respuesta IA [1]');
    assert.ok(res.sources.some((s) => s.id === 'vacunacion-antiaftosa'));
  });

  test('ante fallo del proveedor degrada a extractivo (RF-03)', async () => {
    const orch = createOrchestrator(ganado, { provider: failingProvider(), logger });
    const res = await orch.handleChat({ message: 'signos de la rabia en el ganado' });
    assert.equal(res.mode, 'catalog');
    assert.match(res.reply, /Rabia/i);
  });
});
