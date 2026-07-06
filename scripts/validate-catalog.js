#!/usr/bin/env node
'use strict';

// Valida el catálogo de trámites contra su JSON Schema (RF-04).
// Uso: npm run validate:catalog — pensado para CI y para editores de contenido.

const { loadCatalog } = require('../backend/catalog');

try {
  const catalog = loadCatalog();
  console.log(`✔ Catálogo válido: ${catalog.length} trámites.`);
  for (const tramite of catalog) {
    console.log(`  • ${tramite.id} — ${tramite.nombre}`);
  }
} catch (err) {
  console.error(`✘ ${err.message}`);
  process.exit(1);
}
