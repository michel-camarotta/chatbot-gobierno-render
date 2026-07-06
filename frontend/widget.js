/**
 * Asistente Ciudadano — widget embebible (RF-06, RNF-01).
 *
 * Integración en el sitio del organismo (una sola línea):
 *   <script src="https://SERVICIO/widget.js" defer></script>
 *
 * Configuración opcional por atributos data-*:
 *   data-api-base="https://SERVICIO"   (defecto: origen del propio script)
 *   data-title="Asistente Ciudadano"
 *
 * Sin dependencias ni recursos de terceros (ADR-06). Todo el contenido se
 * inserta con textContent: nunca se interpreta HTML de la red.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var scriptUrl = new URL(script.src, document.baseURI);
  var apiBase = (script.getAttribute('data-api-base') || scriptUrl.origin).replace(/\/$/, '');
  var title = script.getAttribute('data-title') || 'Asistente Ciudadano';

  var HISTORY_MAX = 20;
  // Presupuesto de caracteres del historial enviado: mantiene el cuerpo bien por
  // debajo del límite del servidor aunque haya turnos largos (evita el 413).
  var HISTORY_CHAR_BUDGET = 12000;
  var STORAGE_KEY = 'ac-conversacion';

  // Recorta el historial a los turnos más recientes que entran en el presupuesto
  // de caracteres, sin superar HISTORY_MAX turnos.
  function boundedHistory() {
    var out = [];
    var total = 0;
    for (var i = history.length - 1; i >= 0 && out.length < HISTORY_MAX; i--) {
      var len = (history[i].content || '').length;
      if (total + len > HISTORY_CHAR_BUDGET && out.length > 0) break;
      out.unshift(history[i]);
      total += len;
    }
    return out;
  }

  // La hoja de estilos vive junto al script; se inyecta como <link> para
  // que la integración sea un único <script> y siga cumpliendo CSP.
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('widget.css', scriptUrl).href;
  document.head.appendChild(link);

  /* ---------- estado ---------- */

  var history = [];
  try {
    var saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) history = JSON.parse(saved).slice(-HISTORY_MAX);
  } catch (e) {
    history = [];
  }

  function persistHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-HISTORY_MAX)));
    } catch (e) {
      /* almacenamiento no disponible: la conversación sigue en memoria */
    }
  }

  /* ---------- construcción de DOM (sin innerHTML con datos externos) ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  var root = el('div', 'ac-root');

  var launcher = el('button', 'ac-launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'ac-panel');
  launcher.setAttribute('aria-label', 'Abrir ' + title);
  launcher.appendChild(chatIcon());

  var panel = el('section', 'ac-panel');
  panel.id = 'ac-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', title);
  panel.hidden = true;

  var header = el('header', 'ac-header');
  var headerTitle = el('h2', 'ac-title', title);
  var closeBtn = el('button', 'ac-close');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Cerrar el asistente');
  closeBtn.appendChild(closeIcon());
  header.appendChild(headerTitle);
  header.appendChild(closeBtn);

  var log = el('div', 'ac-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  log.setAttribute('aria-label', 'Conversación');

  var form = el('form', 'ac-form');
  var inputLabel = el('label', 'ac-visually-hidden', 'Escribí tu consulta sobre trámites');
  inputLabel.htmlFor = 'ac-input';
  var input = el('input', 'ac-input');
  input.id = 'ac-input';
  input.type = 'text';
  input.maxLength = 1000;
  input.placeholder = 'Escribí tu consulta…';
  input.autocomplete = 'off';
  var sendBtn = el('button', 'ac-send', 'Enviar');
  sendBtn.type = 'submit';
  form.appendChild(inputLabel);
  form.appendChild(input);
  form.appendChild(sendBtn);

  var disclaimer = el(
    'p',
    'ac-disclaimer',
    'Asistente automatizado. Sus respuestas son informativas y no constituyen resolución administrativa.'
  );

  panel.appendChild(header);
  panel.appendChild(log);
  panel.appendChild(form);
  panel.appendChild(disclaimer);
  root.appendChild(panel);
  root.appendChild(launcher);
  document.body.appendChild(root);

  /* ---------- íconos SVG inline (sin CDNs) ---------- */

  function svg(pathData, viewBox) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', viewBox || '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', pathData);
    p.setAttribute('fill', 'currentColor');
    s.appendChild(p);
    return s;
  }

  function chatIcon() {
    return svg('M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2zm3 5h10v2H7V9zm0 4h7v2H7v-2z');
  }
  function closeIcon() {
    return svg('M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z');
  }

  /* ---------- render de mensajes ---------- */

  // Render seguro de texto plano con estructura ligera: líneas y **negrita**.
  // Todo pasa por textContent; nunca se interpreta HTML recibido.
  function renderText(container, text) {
    var lines = String(text).split('\n');
    lines.forEach(function (line) {
      var p = el('div', 'ac-line');
      var parts = line.split(/\*\*(.+?)\*\*/g);
      parts.forEach(function (part, i) {
        if (i % 2 === 1) {
          p.appendChild(el('strong', null, part));
        } else if (part) {
          p.appendChild(document.createTextNode(part));
        }
      });
      if (parts.length === 1 && !line) p.appendChild(el('br'));
      container.appendChild(p);
    });
  }

  function addMessage(role, text, sources, opts) {
    var wrapper = el('div', 'ac-msg ac-msg--' + role);
    var who = el('span', 'ac-visually-hidden', role === 'user' ? 'Vos:' : 'Asistente:');
    var bubble = el('div', 'ac-bubble');
    bubble.appendChild(who);
    renderText(bubble, text);

    if (sources && sources.length > 0) {
      var srcBox = el('div', 'ac-sources');
      srcBox.appendChild(el('span', 'ac-sources-label', 'Fuentes: '));
      sources.forEach(function (source) {
        srcBox.appendChild(el('span', 'ac-source-chip', source.nombre));
      });
      bubble.appendChild(srcBox);
    }

    wrapper.appendChild(bubble);
    if (opts && opts.feedback) wrapper.appendChild(buildFeedback());
    log.appendChild(wrapper);
    log.scrollTop = log.scrollHeight;
    return wrapper;
  }

  function buildFeedback() {
    var box = el('div', 'ac-feedback');
    var label = el('span', 'ac-feedback-label', '¿Te sirvió?');
    var yes = el('button', 'ac-feedback-btn', 'Sí');
    var no = el('button', 'ac-feedback-btn', 'No');
    yes.type = 'button';
    no.type = 'button';
    yes.setAttribute('aria-label', 'La respuesta fue útil');
    no.setAttribute('aria-label', 'La respuesta no fue útil');

    function send(helpful) {
      box.textContent = '¡Gracias por tu opinión!';
      fetch(apiBase + '/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful: helpful }),
      }).catch(function () {
        /* el feedback es best-effort */
      });
    }

    yes.addEventListener('click', function () { send(true); });
    no.addEventListener('click', function () { send(false); });
    box.appendChild(label);
    box.appendChild(yes);
    box.appendChild(no);
    return box;
  }

  var typingNode = null;
  function showTyping() {
    typingNode = el('div', 'ac-msg ac-msg--assistant');
    var bubble = el('div', 'ac-bubble ac-typing');
    bubble.setAttribute('aria-label', 'El asistente está escribiendo');
    for (var i = 0; i < 3; i++) bubble.appendChild(el('span', 'ac-dot'));
    typingNode.appendChild(bubble);
    log.appendChild(typingNode);
    log.scrollTop = log.scrollHeight;
  }
  function hideTyping() {
    if (typingNode) {
      typingNode.remove();
      typingNode = null;
    }
  }

  /* ---------- envío ---------- */

  var sending = false;

  function send(message) {
    if (sending) return;
    sending = true;
    sendBtn.disabled = true;
    addMessage('user', message);
    showTyping();

    fetch(apiBase + '/api/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, history: boundedHistory() }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            var detail = data && data.error && data.error.message;
            throw new Error(detail || 'Error del servicio');
          }
          return data;
        });
      })
      .then(function (data) {
        hideTyping();
        addMessage('assistant', data.reply, data.sources, { feedback: true });
        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: data.reply });
        persistHistory();
      })
      .catch(function (err) {
        hideTyping();
        showError(err.message, message);
      })
      .finally(function () {
        sending = false;
        sendBtn.disabled = false;
        input.focus();
      });
  }

  function showError(detail, originalMessage) {
    var wrapper = addMessage(
      'assistant',
      'No pude procesar tu consulta en este momento' + (detail ? ' (' + detail + ')' : '') + '.'
    );
    var retry = el('button', 'ac-retry', 'Reintentar');
    retry.type = 'button';
    retry.addEventListener('click', function () {
      wrapper.remove();
      send(originalMessage);
    });
    wrapper.querySelector('.ac-bubble').appendChild(retry);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var message = input.value.trim();
    if (!message) return;
    input.value = '';
    send(message);
  });

  /* ---------- apertura / cierre y foco (RNF-01) ---------- */

  var greeted = false;

  function openPanel() {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'Cerrar ' + title);
    if (!greeted && history.length === 0) {
      greeted = true;
      addMessage(
        'assistant',
        '¡Hola! Soy el asistente de trámites. Preguntame, por ejemplo: "¿Qué necesito para renovar la cédula?" o "¿Cómo habilito un comercio?".'
      );
    } else if (!greeted) {
      greeted = true;
      history.forEach(function (turn) {
        addMessage(turn.role, turn.content);
      });
    }
    input.focus();
  }

  function closePanel() {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'Abrir ' + title);
    launcher.focus();
  }

  launcher.addEventListener('click', function () {
    if (panel.hidden) openPanel();
    else closePanel();
  });
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) closePanel();
  });
})();
