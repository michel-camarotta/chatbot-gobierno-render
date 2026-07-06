'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadCatalog } = require('../backend/catalog');

// RF-04: un catálogo inválido impide el arranque con error descriptivo.

function tempDirWith(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogo-test-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

const tramiteValido = (id) => ({
  id,
  nombre: 'Trámite de prueba',
  descripcion: 'Descripción de prueba con largo suficiente.',
  organismo: 'Organismo de prueba',
  categoria: 'Pruebas',
  modalidad: 'En línea',
  palabrasClave: ['prueba'],
  requisitos: ['Requisito de prueba'],
  pasos: ['Paso de prueba'],
});

describe('validación del catálogo (RF-04, ADR-02)', () => {
  test('el catálogo real del repositorio es válido', () => {
    const catalog = loadCatalog();
    assert.ok(catalog.length > 0);
    for (const tramite of catalog) {
      assert.match(tramite.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  test('rechaza JSON malformado nombrando el archivo', () => {
    const dir = tempDirWith({ 'roto.json': '{no es json' });
    assert.throws(() => loadCatalog(dir), /roto\.json/);
  });

  test('rechaza un trámite que no cumple el schema', () => {
    const invalido = { ...tramiteValido('sin-requisitos'), requisitos: [] };
    const dir = tempDirWith({ 'sin-requisitos.json': JSON.stringify(invalido) });
    assert.throws(() => loadCatalog(dir), /schema/);
  });

  test('rechaza id que no coincide con el nombre del archivo', () => {
    const dir = tempDirWith({ 'otro-nombre.json': JSON.stringify(tramiteValido('distinto')) });
    assert.throws(() => loadCatalog(dir), /otro-nombre\.json/);
  });

  test('rechaza directorio sin trámites', () => {
    const dir = tempDirWith({});
    assert.throws(() => loadCatalog(dir), /vacío/i);
  });
});
