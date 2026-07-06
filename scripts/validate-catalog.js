#!/usr/bin/env node
'use strict';

// Valida todos los bots y su base de conocimiento contra los JSON Schema
// (RF-08). Pensado para CI y para editores de contenido.

const { loadBots } = require('../backend/bots');

try {
  const bots = loadBots();
  console.log(`✔ ${bots.length} bot(s) válido(s):`);
  for (const bot of bots) {
    const colecciones = [...new Set(bot.documents.map((d) => d.coleccion))];
    console.log(`  • ${bot.id} — ${bot.nombre}`);
    console.log(`      agentes: ${bot.agentes.map((a) => a.id).join(', ')}`);
    console.log(`      documentos: ${bot.documents.length} en colecciones [${colecciones.join(', ')}]`);
  }
} catch (err) {
  console.error(`✘ ${err.message}`);
  process.exit(1);
}
