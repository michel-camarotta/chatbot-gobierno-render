'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadBots } = require('../backend/bots');

// RF-08: un bot o documento inválido impide el arranque nombrando el archivo.

function scaffold(bots) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bots-test-'));
  for (const [botId, def] of Object.entries(bots)) {
    const botDir = path.join(root, botId);
    fs.mkdirSync(botDir, { recursive: true });
    fs.writeFileSync(path.join(botDir, 'bot.json'), JSON.stringify(def.config));
    for (const [coleccion, docs] of Object.entries(def.documents || {})) {
      const dir = path.join(botDir, 'knowledge', coleccion);
      fs.mkdirSync(dir, { recursive: true });
      for (const doc of docs) {
        fs.writeFileSync(path.join(dir, `${doc.id}.json`), JSON.stringify(doc));
      }
    }
  }
  return root;
}

const validDoc = (id, coleccion = 'temas') => ({
  id,
  titulo: 'Documento de prueba',
  coleccion,
  etiquetas: ['prueba', 'test'],
  resumen: 'Resumen de prueba con largo suficiente.',
  secciones: [{ titulo: 'Sección', contenido: 'Contenido de prueba suficientemente largo.' }],
  fuente: 'Fuente de prueba',
});

const validBot = (id, colecciones = ['temas']) => ({
  id,
  nombre: 'Bot de prueba',
  descripcion: 'Descripción de prueba con largo suficiente.',
  organismo: 'Organismo de prueba',
  agentes: [
    { id: 'general', nombre: 'General', descripcion: 'Agente general', colecciones, palabrasClave: ['prueba'] },
  ],
});

describe('carga y validación de bots (RF-08)', () => {
  test('la plataforma real carga y valida', () => {
    const bots = loadBots();
    assert.ok(bots.length >= 2);
    for (const bot of bots) {
      assert.match(bot.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
      assert.ok(bot.documents.length > 0);
    }
  });

  test('un bot válido con sus documentos carga bien', () => {
    const root = scaffold({ demo: { config: validBot('demo'), documents: { temas: [validDoc('uno')] } } });
    const bots = loadBots(root);
    assert.equal(bots.length, 1);
    assert.equal(bots[0].documents.length, 1);
  });

  test('rechaza bot.json que no cumple el schema', () => {
    const bad = validBot('demo');
    delete bad.agentes;
    const root = scaffold({ demo: { config: bad, documents: { temas: [validDoc('uno')] } } });
    assert.throws(() => loadBots(root), /schema/);
  });

  test('rechaza agente que referencia una colección inexistente', () => {
    const root = scaffold({
      demo: { config: validBot('demo', ['inexistente']), documents: { temas: [validDoc('uno')] } },
    });
    assert.throws(() => loadBots(root), /inexistente/);
  });

  test('rechaza documento cuya coleccion no coincide con el directorio', () => {
    const doc = validDoc('uno', 'otra');
    const root = scaffold({ demo: { config: validBot('demo'), documents: { temas: [doc] } } });
    assert.throws(() => loadBots(root), /coleccion/);
  });

  test('rechaza documento que no cumple el schema', () => {
    const doc = { ...validDoc('uno'), secciones: [] };
    const root = scaffold({ demo: { config: validBot('demo'), documents: { temas: [doc] } } });
    assert.throws(() => loadBots(root), /schema/);
  });

  test('rechaza id de bot que no coincide con el directorio', () => {
    const root = scaffold({ demo: { config: validBot('otro'), documents: { temas: [validDoc('uno')] } } });
    assert.throws(() => loadBots(root), /demo/);
  });
});
