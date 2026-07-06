'use strict';

// Retrieval léxico sobre el catálogo (RF-02, ADR-03).
// Puntúa cada trámite por coincidencia de tokens normalizados (sin tildes,
// sin plural simple) con pesos por campo. Determinístico y sin dependencias.

const FIELD_WEIGHTS = [
  { fields: ['nombre'], weight: 5 },
  { fields: ['palabrasClave'], weight: 4 },
  { fields: ['categoria', 'departamento'], weight: 2 },
  { fields: ['descripcion'], weight: 2 },
  { fields: ['requisitos', 'documentacion', 'pasos', 'observaciones'], weight: 1 },
];

const STOPWORDS = new Set([
  'a', 'al', 'algo', 'ante', 'como', 'con', 'cual', 'cuando', 'de', 'del', 'donde',
  'el', 'ella', 'en', 'entre', 'era', 'es', 'esa', 'ese', 'esta', 'este', 'esto',
  'estoy', 'hace', 'hacer', 'hago', 'hay', 'la', 'las', 'lo', 'los', 'mas', 'me',
  'mi', 'mis', 'muy', 'necesito', 'no', 'nos', 'o', 'para', 'pero', 'poder', 'por',
  'puedo', 'que', 'quien', 'quiero', 'saber', 'se', 'ser', 'si', 'sin', 'sobre',
  'son', 'soy', 'su', 'sus', 'te', 'tengo', 'tiene', 'tramite', 'tramites', 'tu',
  'un', 'una', 'uno', 'y', 'ya', 'yo',
]);

function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ');
}

function stem(token) {
  // Des-pluralización naive suficiente para español administrativo:
  // "requisitos" → "requisito", "habilitaciones" → "habilitacion".
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function tokenize(text) {
  return normalize(text)
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token))
    .map(stem);
}

function collectText(value) {
  if (Array.isArray(value)) return value.join(' ');
  if (value === undefined || value === null) return '';
  return String(value);
}

function createRetrieval(catalog, { topK = 3, threshold = 3 } = {}) {
  // Índice: por trámite, mapa token → mejor peso del campo donde aparece.
  const index = catalog.map((tramite) => {
    const tokenWeights = new Map();
    for (const { fields, weight } of FIELD_WEIGHTS) {
      for (const field of fields) {
        for (const token of tokenize(collectText(tramite[field]))) {
          if ((tokenWeights.get(token) || 0) < weight) tokenWeights.set(token, weight);
        }
      }
    }
    return { tramite, tokenWeights };
  });

  function search(query, { limit = topK } = {}) {
    const queryTokens = [...new Set(tokenize(query))];
    if (queryTokens.length === 0) return [];

    const scored = index
      .map(({ tramite, tokenWeights }) => {
        let score = 0;
        for (const token of queryTokens) {
          score += tokenWeights.get(token) || 0;
        }
        return { tramite, score };
      })
      .filter(({ score }) => score >= threshold)
      .sort((a, b) => b.score - a.score || a.tramite.id.localeCompare(b.tramite.id));

    return scored.slice(0, limit);
  }

  return { search };
}

module.exports = { createRetrieval, normalize, tokenize };
