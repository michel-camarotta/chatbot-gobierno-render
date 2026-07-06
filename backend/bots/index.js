'use strict';

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

// Carga de todos los bots de la plataforma con validación por JSON Schema
// (RF-08). Un bot o documento inválido impide el arranque nombrando el archivo.

const DEFAULT_DIR = path.join(__dirname, '..', '..', 'data', 'bots');
const SCHEMA_DIR = path.join(__dirname, '..', '..', 'data', 'schema');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function compile(ajv, schemaFile) {
  return ajv.compile(readJson(path.join(SCHEMA_DIR, schemaFile)));
}

function loadDocuments(botDir, ajv, validateDocumento) {
  const knowledgeDir = path.join(botDir, 'knowledge');
  if (!fs.existsSync(knowledgeDir)) {
    throw new Error(`Bot inválido: falta el directorio knowledge/ en ${botDir}`);
  }

  const documents = [];
  const colecciones = fs
    .readdirSync(knowledgeDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const coleccion of colecciones) {
    const dir = path.join(knowledgeDir, coleccion);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
    for (const file of files) {
      const rel = path.join('knowledge', coleccion, file);
      let doc;
      try {
        doc = readJson(path.join(dir, file));
      } catch (err) {
        throw new Error(`Documento inválido: ${rel} no es JSON válido (${err.message})`);
      }
      if (!validateDocumento(doc)) {
        const detail = validateDocumento.errors
          .map((e) => `${e.instancePath || '(raíz)'} ${e.message}`)
          .join('; ');
        throw new Error(`Documento inválido: ${rel} no cumple el schema: ${detail}`);
      }
      const expectedId = path.basename(file, '.json');
      if (doc.id !== expectedId) {
        throw new Error(`Documento inválido: ${rel} declara id "${doc.id}" pero debe ser "${expectedId}".`);
      }
      if (doc.coleccion !== coleccion) {
        throw new Error(
          `Documento inválido: ${rel} declara coleccion "${doc.coleccion}" pero está en "${coleccion}".`
        );
      }
      documents.push(doc);
    }
  }
  return documents;
}

function loadBots(dir = DEFAULT_DIR) {
  const ajv = new Ajv({ allErrors: true });
  const validateBot = compile(ajv, 'bot.schema.json');
  const validateDocumento = compile(ajv, 'documento.schema.json');

  const botDirs = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (botDirs.length === 0) {
    throw new Error(`No hay bots configurados en ${dir}`);
  }

  const bots = botDirs.map((botId) => {
    const botDir = path.join(dir, botId);
    const configPath = path.join(botDir, 'bot.json');
    if (!fs.existsSync(configPath)) {
      throw new Error(`Bot inválido: falta bot.json en ${botDir}`);
    }

    let config;
    try {
      config = readJson(configPath);
    } catch (err) {
      throw new Error(`Bot inválido: ${botId}/bot.json no es JSON válido (${err.message})`);
    }
    if (!validateBot(config)) {
      const detail = validateBot.errors
        .map((e) => `${e.instancePath || '(raíz)'} ${e.message}`)
        .join('; ');
      throw new Error(`Bot inválido: ${botId}/bot.json no cumple el schema: ${detail}`);
    }
    if (config.id !== botId) {
      throw new Error(`Bot inválido: ${botId}/bot.json declara id "${config.id}" pero debe ser "${botId}".`);
    }

    const documents = loadDocuments(botDir, ajv, validateDocumento);
    const coleccionesDisponibles = new Set(documents.map((d) => d.coleccion));

    // Todo agente debe apuntar a colecciones que existan.
    for (const agente of config.agentes) {
      for (const coleccion of agente.colecciones) {
        if (!coleccionesDisponibles.has(coleccion)) {
          throw new Error(
            `Bot inválido: el agente "${agente.id}" de ${botId} referencia la colección inexistente "${coleccion}".`
          );
        }
      }
    }

    return { ...config, documents };
  });

  const ids = bots.map((b) => b.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) throw new Error(`Bot inválido: id duplicado "${dup}".`);

  return bots;
}

module.exports = { loadBots, DEFAULT_DIR };
