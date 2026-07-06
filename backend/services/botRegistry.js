'use strict';

const { createOrchestrator } = require('./orchestrator');

// Registro de bots de la plataforma: por cada bot construye su orquestador
// (con sus agentes y su RAG) y ofrece búsquedas por id (RF-08).

function createBotRegistry(bots, { provider, logger, topK }) {
  const registry = new Map();
  for (const bot of bots) {
    registry.set(bot.id, {
      bot,
      orchestrator: createOrchestrator(bot, { provider, logger, topK }),
    });
  }

  function get(botId) {
    return registry.get(botId) || null;
  }

  function list() {
    return bots.map((bot) => ({
      id: bot.id,
      nombre: bot.nombre,
      descripcion: bot.descripcion,
      organismo: bot.organismo,
      agentes: bot.agentes.map((a) => ({ id: a.id, nombre: a.nombre, descripcion: a.descripcion })),
    }));
  }

  return { get, list, has: (id) => registry.has(id) };
}

module.exports = { createBotRegistry };
