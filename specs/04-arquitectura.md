# 04 — Arquitectura

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
│  services/      lógica: chat, retrieval, feedback      │
│  providers/     proveedor de IA (OpenAI) + fallback    │
│  catalog/       carga y validación del catálogo        │
│  middleware/    requestId, errores, seguridad          │
│                                                        │
│  data/tramites/*.json   catálogo (fuente de verdad)    │
└────────────┬───────────────────────────────────────────┘
             │ HTTPS (opcional, con timeout y degradación)
      ┌──────▼───────┐
      │ Proveedor IA │
      └──────────────┘
```

## Flujo de una consulta (RF-01..03)

1. `POST /api/v1/chat` → middleware: request ID, rate limit, validación del body.
2. `retrieval.search(message)` puntúa los trámites del catálogo (tokens normalizados
   sin tildes, pesos por campo: nombre > palabras clave > descripción > resto) y
   devuelve el top-K sobre un umbral mínimo.
3. Si hay proveedor de IA: se construye un prompt de sistema restringido ("respondé
   solo con la información de estos trámites; si no alcanza, decilo y derivá a los
   canales oficiales") + trámites recuperados + historial acotado + mensaje. Timeout
   configurable.
4. Si no hay proveedor, falla o expira: `catalogAnswer()` genera una ficha
   determinística del trámite más relevante (modo `catalog`).
5. Respuesta con `reply`, `sources` y `mode`; log estructurado con latencia.

## Decisiones de arquitectura (ADR)

### ADR-01 — Servicio stateless; el historial viaja con el cliente
El servidor no persiste conversaciones: el widget envía los últimos N turnos en cada
solicitud. Permite escalar horizontalmente sin sesión pegajosa ni base de datos, y
minimiza datos personales en el servidor (ver SEG-05). Trade-off: payload algo mayor
por solicitud (acotado a 20 turnos).

### ADR-02 — Catálogo en archivos JSON validados por schema
El catálogo vive en `data/tramites/*.json` (un archivo por trámite) validado contra
`data/schema/tramite.schema.json` al arranque. Editable por personal no desarrollador
vía pull request, versionado y auditable con git, sin base de datos que operar. Si el
volumen supera algunos cientos de trámites, migrar a un almacén con índice (ADR
futuro) sin cambiar el contrato de `catalog/`.

### ADR-03 — Retrieval léxico, no embeddings (en v1)
Búsqueda por puntaje de tokens normalizados con sinónimos configurados por trámite.
Con decenas de trámites es suficiente, determinístico, gratis y sin dependencias
externas. La interfaz `search(query) → [{tramite, score}]` permite sustituir la
implementación por embeddings más adelante sin tocar el resto.

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
  routes/              # chat, tramites, feedback, health, legacy
  services/            # chatService, retrieval, catalogAnswer
  providers/           # openaiProvider, index (selección por config)
  catalog/             # loader + validación por schema
  middleware/          # requestId, errorHandler, notFound
  logger.js
data/
  schema/tramite.schema.json
  tramites/*.json
frontend/
  index.html           # página de demostración
  widget.js            # widget embebible
  widget.css
specs/                 # este directorio
test/                  # pruebas node:test
```

## Configuración (RNF-04)

Ver `.env.example`. Claves principales: `PORT`, `OPENAI_API_KEY` (opcional),
`OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`, `CORS_ORIGINS`, `RATE_LIMIT_*`,
`RETRIEVAL_TOP_K`, `LOG_LEVEL`, `TRUST_PROXY`.
