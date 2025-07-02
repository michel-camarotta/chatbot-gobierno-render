const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { askChatGPT } = require('./openaiClient');
const tramites = require('./tramites.json');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/ask', async (req, res) => {
  const { message } = req.body;
  try {
    const promptBase = `Estás ayudando a una persona a entender cómo hacer trámites públicos. Respondé con claridad y paso a paso. Si el trámite está en esta base, respondé con esa información:\n\n${JSON.stringify(tramites)}\n\nPregunta del ciudadano: ${message}`;
    const reply = await askChatGPT(promptBase);
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al generar respuesta' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
