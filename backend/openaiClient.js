const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function askChatGPT(prompt) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  });

  console.log(JSON.stringify(completion, null, 2)); // 🐞 Log completo

  return completion.choices?.[0]?.message?.content || '[Error: respuesta vacía o inesperada]';
}

module.exports = { askChatGPT };
