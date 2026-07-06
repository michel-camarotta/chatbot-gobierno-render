'use strict';

const { tokenize } = require('./retrieval');

// Recuperación (RAG) sobre las secciones de los documentos de un bot (RF-10).
// Cada sección es un "chunk" con metadatos de origen; el orquestador entrega
// al modelo solo los chunks recuperados, nunca la base completa.
// La interfaz search() permite sustituir esta implementación léxica por una
// vectorial sin cambiar el resto del sistema (ADR-07).

const WEIGHT = {
  titulo: 5,
  etiquetas: 4,
  seccionTitulo: 3,
  contenido: 1,
};

function indexTokens(sources) {
  // sources: [{ text, weight }] → Map token → mejor peso
  const map = new Map();
  for (const { text, weight } of sources) {
    for (const token of tokenize(text)) {
      if ((map.get(token) || 0) < weight) map.set(token, weight);
    }
  }
  return map;
}

function buildChunks(documents) {
  const chunks = [];
  for (const doc of documents) {
    const etiquetas = (doc.etiquetas || []).join(' ');
    const secciones = [{ titulo: 'Resumen', contenido: doc.resumen }, ...doc.secciones];
    for (const seccion of secciones) {
      chunks.push({
        docId: doc.id,
        titulo: doc.titulo,
        coleccion: doc.coleccion,
        organismo: doc.organismo || null,
        fuente: doc.fuente,
        enlaceOficial: doc.enlaceOficial || null,
        seccion: seccion.titulo,
        texto: seccion.contenido,
        tokenWeights: indexTokens([
          { text: doc.titulo, weight: WEIGHT.titulo },
          { text: etiquetas, weight: WEIGHT.etiquetas },
          { text: seccion.titulo, weight: WEIGHT.seccionTitulo },
          { text: seccion.contenido, weight: WEIGHT.contenido },
        ]),
      });
    }
  }
  return chunks;
}

function createRag(documents, { topK = 4, threshold = 3 } = {}) {
  const chunks = buildChunks(documents);

  function search(query, { colecciones = null, limit = topK, minScore = threshold } = {}) {
    const queryTokens = [...new Set(tokenize(query))];
    if (queryTokens.length === 0) return [];

    const allow = colecciones ? new Set(colecciones) : null;

    return chunks
      .filter((chunk) => !allow || allow.has(chunk.coleccion))
      .map((chunk) => {
        let score = 0;
        for (const token of queryTokens) score += chunk.tokenWeights.get(token) || 0;
        return { chunk, score };
      })
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score || a.chunk.docId.localeCompare(b.chunk.docId))
      .slice(0, limit);
  }

  return { search, chunkCount: chunks.length };
}

module.exports = { createRag, buildChunks };
