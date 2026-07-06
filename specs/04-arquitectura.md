# 04 — Arquitectura

> Este documento describe el núcleo del servicio. La plataforma es **multi-bot** con
> orquestador de agentes y RAG: el detalle está en
> [07-plataforma-multibot-agentes.md](07-plataforma-multibot-agentes.md), que
> profundiza el flujo de una consulta, el ruteo a agentes y la recuperación.

## Vista general

```
┌────────────────────────────┐
│ Sitio del organismo        │
│  └── widget.js (embed)     │
└────────────┬───────────────┘
             │ HTTPS (same-origin o CORS configurado)
┌────────────▼───────────────────────────────────────────┐
│ Servicio Node.js (Express)                             │
│                                                        │
│  routes/        capa HTTP: validación, rate limit      │
│  services/      orquestador, RAG, respuesta fundada     │
│  providers/     proveedor de IA (OpenAI) + fallback    │
│  bots/          carga y validación de bots + schemas    │
│  middleware/    requestId, errores, seguridad          │
│                                                        │
│  data/bots/<botId>/  bot.json + knowledge/ (fuente de verdad) │
└────────────┬───────────────────────────────────────────┘
             │ HTTPS (opcional, con timeout y degradación)
      ┌──────▼───────┐
      │ Proveedor IA │
      └──────────────┘
```

## Flujo de una consulta (RF-01..03, ampliado en RF-09..11)

1. `POST /api/v1/bots/:botId/chat` (o el atajo `/api/v1/chat` al bot por defecto) →
   middleware: request ID, rate limit, validación del body.
2. El **orquestador** del bot rutea a los agentes especialistas pertinentes; cada uno
   recupera (RAG) las secciones más relevantes de sus colecciones (tokens normalizados
   sin tildes, pesos por campo) y se combinan las mejores sobre un umbral mínimo.
3. Si hay proveedor de IA: se construye un prompt de sistema restringido al CONTEXTO
   recuperado ("respondé solo con estos fragmentos; si no alcanza, decilo y derivá a
   los canales oficiales") + fragmentos + historial acotado + mensaje. Timeout configurable.
4. Si no hay proveedor, falla o expira: `groundedAnswer()` compone una respuesta
   extractiva citando los fragmentos recuperados (modo `catalog`, sin generación libre).
5. Respuesta con `reply`, `sources`, `agentes`, `mode` y `bot`; log estructurado con latencia.

## Decisiones de arquitectura (ADR)

### ADR-01 — Servicio stateless; el historial viaja con el cliente
El servidor no persiste conversaciones: el widget envía los últimos N turnos en cada
solicitud. Permite escalar horizontalmente sin sesión pegajosa ni base de datos, y
minimiza datos personales en el servidor (ver SEG-05). Trade-off: payload algo mayor
por solicitud (acotado a 20 turnos).

### ADR-02 — Conocimiento en archivos JSON validados por schema
La base de conocimiento de cada bot vive en `data/bots/<botId>/knowledge/<coleccion>/*.json`
(un archivo por documento) validada contra `data/schema/documento.schema.json`, y el
`bot.json` contra `data/schema/bot.schema.json`, al arranque. Editable por personal no
desarrollador vía pull request, versionada y auditable con git, sin base de datos que
operar. Si el volumen supera algunos cientos de documentos por bot, migrar a un almacén
con índice (ADR futuro) sin cambiar el contrato del loader de `bots/`.

### ADR-03 — Retrieval léxico, no embeddings (en v1)
Búsqueda por puntaje de tokens normalizados con sinónimos (etiquetas) configurados por
documento. Con decenas de documentos por bot es suficiente, determinístico, gratis y
sin dependencias externas. La interfaz `search(query) → [{chunk, score}]` permite
sustituir la implementación por embeddings más adelante sin tocar el resto (ver ADR-07
en la spec 07).

### ADR-04 — Proveedor de IA detrás de una interfaz con degradación
`providers/` expone `generateReply({system, messages}) → string`. Implementaciones:
`openai` (Chat Completions, modelo configurable) y `none`. El servicio degrada a modo
catálogo ante ausencia de configuración, error o timeout del proveedor: la
disponibilidad del asistente no depende de un tercero (RNF-05).

### ADR-05 — Node.js + Express, CommonJS, dependencias mínimas
Se mantiene el stack de la PoC (conocido por el equipo) elevado a producción:
`helmet`, `express-rate-limit`, `pino` como únicas incorporaciones. Pruebas con el
runner nativo `node:test` (sin framework externo). Menos superficie de ataque y de
mantenimiento.

### ADR-06 — Frontend vanilla, cero dependencias
El widget es JS/CSS puro con Shadow-DOM-like scoping por prefijo de clase, sin
frameworks ni assets de terceros: nada que auditar de supply-chain en el navegador
del ciudadano, y la integración es un `<script>`.

## Estructura de directorios

```
backend/
  server.js            # bootstrap + graceful shutdown
  app.js               # factory de la app Express (testeable)
  config.js            # carga y validación de variables de entorno
  routes/              # bots, chat, feedback, health, legacy
  services/            # orchestrator, botRegistry, rag, retrieval, groundedAnswer
  providers/           # openaiProvider, index (selección por config)
  bots/                # loader + validación de bots y documentos por schema
  middleware/          # requestId, errorHandler, notFound
  logger.js
data/
  schema/bot.schema.json
  schema/documento.schema.json
  bots/<botId>/bot.json
  bots/<botId>/knowledge/<coleccion>/*.json
frontend/
  index.html           # página de demostración (bot por defecto)
  ganado.html          # demostración del bot mgap-ganado
  widget.js            # widget embebible (data-bot-id)
  widget.css
specs/                 # este directorio
test/                  # pruebas node:test
```

## Configuración (RNF-04)

Ver `.env.example`. Claves principales: `PORT`, `OPENAI_API_KEY` (opcional),
`OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`, `CORS_ORIGINS`, `RATE_LIMIT_*`,
`RETRIEVAL_TOP_K`, `LOG_LEVEL`, `TRUST_PROXY`.
