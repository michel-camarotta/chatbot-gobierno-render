'use strict';

const OpenAI = require('openai');

// Proveedor de IA sobre la API de OpenAI (ADR-04). Timeout y reintentos
// acotados: si algo falla, el orquestador degrada a modo extractivo (RF-03).

function createOpenAiProvider({ apiKey, model, timeoutMs }) {
  const client = new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 1 });

  async function generateReply({ system, messages }) {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.2,
      max_tokens: 800,
    });

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply || !reply.trim()) {
      throw new Error('El proveedor devolvió una respuesta vacía');
    }
    return reply.trim();
  }

  return { name: 'openai', generateReply };
}

module.exports = { createOpenAiProvider };
