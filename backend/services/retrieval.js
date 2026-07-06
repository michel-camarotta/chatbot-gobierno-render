'use strict';

// Utilidades de texto para la recuperación léxica (ADR-03): normalización sin
// tildes y tokenización con eliminación de stopwords y des-pluralización naive.
// Determinístico y sin dependencias. Usado por el RAG (rag.js) y el ruteo de
// agentes (orchestrator.js).

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
  // Des-pluralización naive suficiente para español:
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

module.exports = { normalize, tokenize };
