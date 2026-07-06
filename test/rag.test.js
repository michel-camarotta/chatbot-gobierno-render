'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createRag } = require('../backend/services/rag');
const { getBot } = require('./helpers');

// RF-10: recuperación (RAG) sobre las secciones de los documentos.

describe('RAG (RF-10)', () => {
  const ganado = getBot('mgap-ganado');
  const rag = createRag(ganado.documents, { topK: 4 });

  test('recupera fragmentos del documento relevante', () => {
    const results = rag.search('fiebre aftosa vesículas en la boca');
    assert.ok(results.length > 0);
    assert.equal(results[0].chunk.docId, 'fiebre-aftosa');
    // Cada resultado trae metadatos de origen para citar.
    assert.ok(results[0].chunk.titulo);
    assert.ok(results[0].chunk.seccion);
    assert.ok(results[0].chunk.fuente);
  });

  test('es insensible a tildes y mayúsculas', () => {
    const a = rag.search('vacunación antiaftosa');
    const b = rag.search('VACUNACION ANTIAFTOSA');
    assert.ok(a.length > 0);
    assert.deepEqual(
      a.map((r) => r.chunk.docId),
      b.map((r) => r.chunk.docId)
    );
  });

  test('filtra por colección', () => {
    const results = rag.search('control y tratamiento', { colecciones: ['controles'] });
    assert.ok(results.length > 0);
    assert.ok(results.every((r) => r.chunk.coleccion === 'controles'));
  });

  test('recupera por sinónimos/etiquetas (orina roja → tristeza parasitaria)', () => {
    const results = rag.search('animal con orina roja y anemia');
    assert.ok(results.some((r) => r.chunk.docId === 'garrapata-tristeza-parasitaria'));
  });

  test('respeta el umbral: sin coincidencias devuelve vacío', () => {
    assert.deepEqual(rag.search('teoría cuántica de campos'), []);
    assert.deepEqual(rag.search('   '), []);
  });

  test('no supera el límite topK', () => {
    const results = rag.search('enfermedad ganado bovino aviso control', { limit: 4 });
    assert.ok(results.length <= 4);
  });
});
