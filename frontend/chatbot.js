
const container = document.getElementById('chatbot-container');
container.innerHTML = `
<div id="chatbot-box">
  <header>🤖 Asistente IMC</header>
  <div id="chat-window"></div>
  <div id="chat-input">
    <input type="text" id="chat-question" placeholder="Escribí tu pregunta..." />
    <button onclick="sendToBot()">Enviar</button>
  </div>
</div>`;

const chatWindow = document.getElementById('chat-window');
const input = document.getElementById('chat-question');

function appendMessage(text, sender) {
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-message ' + sender;

  const avatar = document.createElement('img');
  avatar.src = sender === 'chat-user'
    ? 'https://cdn-icons-png.flaticon.com/512/847/847969.png'
    : 'https://cdn-icons-png.flaticon.com/512/4712/4712027.png';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;

  wrapper.appendChild(sender === 'chat-user' ? bubble : avatar);
  wrapper.appendChild(sender === 'chat-user' ? avatar : bubble);

  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendToBot() {
  const msg = input.value.trim();
  if (!msg) return;

  appendMessage(msg, 'chat-user');
  input.value = '';

  try {
    const res = await fetch('https://chatbot-gobierno-render.onrender.com/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    appendMessage(data.reply || '[Error en la respuesta]', 'chat-bot');
  } catch (err) {
    appendMessage('[Error al conectar con el servidor]', 'chat-bot');
  }
}

input.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendToBot();
});
