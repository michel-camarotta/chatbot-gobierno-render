'use strict';

// Respuesta extractiva y fundada, construida solo con los fragmentos recuperados
// (RF-11, modo degradado sin IA). Al citar textualmente el conocimiento curado,
// es imposible alucinar por construcción.

function deriveMessage(bot) {
  const canal = bot.canalOficial || {};
  const partes = [];
  if (canal.descripcion) partes.push(canal.descripcion);
  if (canal.telefono) partes.push(`Tel: ${canal.telefono}`);
  if (canal.email) partes.push(canal.email);
  if (canal.enlace) partes.push(canal.enlace);
  return partes.length ? partes.join(' · ') : 'los canales oficiales del organismo.';
}

function noResults(bot) {
  return [
    'No encontré información sobre esa consulta en mi base de conocimiento.',
    '',
    `Te sugiero contactar ${deriveMessage(bot)}`,
  ].join('\n');
}

// Agrupa los chunks recuperados por documento, respetando el orden de relevancia.
function groupByDoc(results) {
  const docs = [];
  const index = new Map();
  for (const { chunk } of results) {
    if (!index.has(chunk.docId)) {
      const entry = { docId: chunk.docId, titulo: chunk.titulo, fuente: chunk.fuente, enlaceOficial: chunk.enlaceOficial, secciones: [] };
      index.set(chunk.docId, entry);
      docs.push(entry);
    }
    index.get(chunk.docId).secciones.push({ titulo: chunk.seccion, texto: chunk.texto });
  }
  return docs;
}

function groundedAnswer(results, bot) {
  if (results.length === 0) return noResults(bot);

  const docs = groupByDoc(results).slice(0, 3);
  const bloques = docs.map((doc) => {
    const lines = [`**${doc.titulo}**`];
    for (const seccion of doc.secciones.slice(0, 3)) {
      if (seccion.titulo && seccion.titulo !== 'Resumen') lines.push(`_${seccion.titulo}_`);
      lines.push(seccion.texto);
    }
    lines.push(`Fuente: ${doc.fuente}${doc.enlaceOficial ? ` — ${doc.enlaceOficial}` : ''}`);
    return lines.join('\n');
  });

  return bloques.join('\n\n');
}

module.exports = { groundedAnswer, noResults, groupByDoc };
