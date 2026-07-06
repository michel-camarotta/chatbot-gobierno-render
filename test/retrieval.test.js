'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createRetrieval } = require('../backend/services/retrieval');
const { catalog } = require('./helpers');

// RF-02: retrieval léxico sobre el catálogo.

describe('retrieval (RF-02)', () => {
  const retrieval = createRetrieval(catalog, { topK: 3 });

  test('recupera el trámite relevante para una consulta directa', () => {
    const results = retrieval.search('habilitación comercial');
    assert.ok(results.length > 0);
    assert.equal(results[0].tramite.id, 'habilitacion-comercial-tipo-b-canelones');
  });

  test('es insensible a tildes y mayúsculas', () => {
    const conTilde = retrieval.search('cédula de identidad');
    const sinTilde = retrieval.search('CEDULA DE IDENTIDAD');
    assert.ok(conTilde.length > 0);
    assert.deepEqual(
      conTilde.map((r) => r.tramite.id),
      sinTilde.map((r) => r.tramite.id)
    );
  });

  test('encuentra por sinónimos del catálogo (palabrasClave)', () => {
    const results = retrieval.search('quiero renovar la libreta de conducir');
    assert.ok(results.length > 0);
    assert.equal(results[0].tramite.id, 'licencia-de-conducir-canelones');
  });

  test('maneja plurales simples', () => {
    const singular = retrieval.search('habilitacion');
    const plural = retrieval.search('habilitaciones');
    assert.ok(plural.length > 0);
    assert.equal(plural[0].tramite.id, singular[0].tramite.id);
  });

  test('devuelve como máximo topK resultados', () => {
    const retrievalTop2 = createRetrieval(catalog, { topK: 2 });
    // "canelones" aparece en varios trámites departamentales.
    const results = retrievalTop2.search('tramites en canelones');
    assert.ok(results.length <= 2);
  });

  test('sin coincidencias relevantes devuelve lista vacía (umbral)', () => {
    const results = retrieval.search('ornitorrinco radiactivo intergaláctico');
    assert.deepEqual(results, []);
  });

  test('consulta vacía o solo stopwords devuelve lista vacía', () => {
    assert.deepEqual(retrieval.search('   '), []);
    assert.deepEqual(retrieval.search('que como donde'), []);
  });
});
