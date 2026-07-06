'use strict';

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

// Carga del catálogo de trámites desde data/tramites/*.json con validación
// por JSON Schema (RF-04, ADR-02). Un catálogo inválido impide el arranque.

const DEFAULT_DIR = path.join(__dirname, '..', '..', 'data', 'tramites');
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'data', 'schema', 'tramite.schema.json');

function loadCatalog(dir = DEFAULT_DIR) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    throw new Error(`Catálogo vacío: no hay archivos .json en ${dir}`);
  }

  const seen = new Set();
  const tramites = files.map((file) => {
    const fullPath = path.join(dir, file);
    let tramite;
    try {
      tramite = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
      throw new Error(`Catálogo inválido: ${file} no es JSON válido (${err.message})`);
    }

    if (!validate(tramite)) {
      const detail = validate.errors
        .map((e) => `${e.instancePath || '(raíz)'} ${e.message}`)
        .join('; ');
      throw new Error(`Catálogo inválido: ${file} no cumple el schema: ${detail}`);
    }

    const expectedId = path.basename(file, '.json');
    if (tramite.id !== expectedId) {
      throw new Error(
        `Catálogo inválido: ${file} declara id "${tramite.id}" pero debe ser "${expectedId}".`
      );
    }
    if (seen.has(tramite.id)) {
      throw new Error(`Catálogo inválido: id duplicado "${tramite.id}".`);
    }
    seen.add(tramite.id);
    return tramite;
  });

  return tramites;
}

module.exports = { loadCatalog, DEFAULT_DIR };
