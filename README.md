# Asistente Ciudadano — Plataforma de chatbots para el Estado

Plataforma para desplegar **múltiples asistentes conversacionales** en sitios de
organismos públicos uruguayos. Cada chatbot se configura para un dominio (trámites de
una intendencia, sanidad animal del MGAP, salud, educación…), tiene detrás un
**orquestador con agentes especialistas** y responde mediante **RAG** sobre una base
de conocimiento curada — con citas de fuentes y sin inventar información.

[![CI](https://github.com/michel-camarotta/chatbot-gobierno-render/actions/workflows/ci.yml/badge.svg)](https://github.com/michel-camarotta/chatbot-gobierno-render/actions/workflows/ci.yml)

Incluye dos bots de ejemplo, listos para probar:

- **`canelones-tramites`** — trámites de la Intendencia de Canelones (bot por defecto).
- **`mgap-ganado`** — sanidad animal del MGAP: enfermedades del ganado, protocolos de
  aviso obligatorio, controles y trazabilidad, con 4 agentes especialistas.

## Características

- 🤖 **Multi-bot**: un asistente por organismo o dominio, agregable sin tocar código
  (un directorio con su `bot.json` y sus documentos).
- 🧠 **Orquestador + agentes**: cada bot rutea la consulta a los agentes pertinentes,
  que recuperan de sus propias colecciones y componen una única respuesta.
- 🔎 **RAG con citas**: solo los fragmentos recuperados llegan al modelo; cada
  respuesta expone sus `sources` (documento y sección) → auditable y sin alucinar.
- 🛡️ **Modo degradado sin IA**: sin `OPENAI_API_KEY` (o si el proveedor falla) la
  respuesta es **extractiva** desde el conocimiento curado — cero riesgo de invención
  y disponibilidad garantizada.
- 🧩 **Widget embebible en una línea**, accesible (WCAG 2.1 AA), sin CDNs de terceros,
  seleccionable por bot con `data-bot-id`.
- 📚 **Conocimiento como fuente de verdad**: documentos JSON validados por schema,
  editables por personal no técnico vía pull request.
- 🔒 **Listo para producción**: headers de seguridad, rate limiting, CORS cerrado por
  defecto, validación estricta, logs estructurados sin datos personales, healthchecks,
  apagado graceful, API versionada con OpenAPI.
- ✅ **Spec-driven development**: especificaciones versionadas en [`specs/`](specs/)
  con trazabilidad requerimiento → prueba (58 pruebas automatizadas).

## Inicio rápido

Requiere Node.js ≥ 20.

```bash
npm ci
cp .env.example .env    # opcional: agregar OPENAI_API_KEY para modo IA
npm start
```

Abrir http://localhost:3001 — la página de demostración incluye el widget funcionando.
Sin clave de API el asistente opera en **modo catálogo** (totalmente funcional).

```bash
npm test                # suite completa (58 pruebas), sin red ni claves
npm run validate:bots   # valida todos los bots y su base de conocimiento
npm run dev             # desarrollo con recarga automática
```

La demo abre en `/` (bot de trámites) y `/ganado.html` (bot de sanidad animal).

## Arquitectura: plataforma multi-bot con agentes y RAG

```
Ciudadano ─▶ Bot (p. ej. mgap-ganado)
                 │
             Orquestador ── rutea por relevancia ──▶ Agente Enfermedades ─▶ RAG(enfermedades)
                 │                                 ├▶ Agente Protocolos   ─▶ RAG(protocolos)
                 │                                 ├▶ Agente Controles    ─▶ RAG(controles)
                 │                                 └▶ Agente Normativa    ─▶ RAG(normativa)
                 ▼
       Respuesta fundada + fuentes citadas + agentes consultados
```

El detalle está en [`specs/07-plataforma-multibot-agentes.md`](specs/07-plataforma-multibot-agentes.md).
**Cómo evita alucinar**: recupera antes de responder (RAG); el prompt restringe al
modelo al contexto recuperado; hay umbral de relevancia (si no alcanza, deriva a
canales oficiales); cada respuesta cita fuentes; y el modo sin IA es extractivo (no
genera texto libre). Ver [`specs/05-seguridad-privacidad.md`](specs/05-seguridad-privacidad.md) (SEG-06).

## Integración del widget en el sitio del organismo

```html
<!-- bot por defecto del servicio -->
<script src="https://SU-SERVICIO/widget.js" defer></script>

<!-- un bot específico -->
<script src="https://SU-SERVICIO/widget.js" data-bot-id="mgap-ganado" defer></script>
```

Atributos opcionales: `data-bot-id`, `data-title` y `data-api-base` (si el widget se
sirve desde otro origen, agregar ese origen a `CORS_ORIGINS` del servicio).

## API

Base: `/api/v1` — contrato completo en [`specs/openapi.yaml`](specs/openapi.yaml).

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/bots` | Lista los bots de la plataforma |
| GET | `/api/v1/bots/:botId` | Detalle del bot (agentes, colecciones) |
| POST | `/api/v1/bots/:botId/chat` | Consulta conversacional con un bot |
| GET | `/api/v1/bots/:botId/documents?q=` | Base de conocimiento del bot |
| GET | `/api/v1/bots/:botId/documents/:docId` | Documento completo |
| POST | `/api/v1/chat` | Atajo al bot por defecto (`DEFAULT_BOT`) |
| POST | `/api/v1/feedback` | Feedback ciudadano (útil / no útil) |
| GET | `/api/v1/health` · `/ready` | Liveness / readiness |
| POST | `/ask` | ⚠️ Deprecado — alias de compatibilidad con la PoC |

## Agregar o editar un bot

Un bot es un directorio en [`data/bots/`](data/bots/):

```
data/bots/<botId>/
  bot.json                     # identidad y agentes (data/schema/bot.schema.json)
  knowledge/<coleccion>/*.json # documentos (data/schema/documento.schema.json)
```

1. Crear el directorio del bot con su `bot.json` (definí sus agentes y qué colecciones
   cubre cada uno). Usá un bot existente como plantilla.
2. Cargar documentos en `knowledge/<coleccion>/`. El `id` del documento debe coincidir
   con el nombre del archivo, y su `coleccion` con el directorio.
3. Validar: `npm run validate:bots` (también corre en CI).
4. Abrir un pull request. Al desplegarse, la plataforma incorpora el bot automáticamente.

El campo `etiquetas` de cada documento y las `palabrasClave` de cada agente mejoran el
ruteo y la recuperación: incluí los términos que usa la gente ("libreta" además de
"licencia", "orina roja" además de "babesiosis").

## Configuración

Todas las opciones por variables de entorno, documentadas en
[`.env.example`](.env.example). Resumen: `PORT`, `LOG_LEVEL`, `TRUST_PROXY`,
`CORS_ORIGINS`, `OPENAI_API_KEY` (opcional), `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`,
`RETRIEVAL_TOP_K`, `RATE_LIMIT_*`.

## Despliegue

**Render** (config incluida en [`render.yaml`](render.yaml)): crear el servicio desde
el repositorio; cargar `OPENAI_API_KEY` como secreto si se desea el modo IA.

**Docker** (cualquier plataforma de contenedores):

```bash
docker build -t asistente-ciudadano .
docker run -p 3001:3001 -e OPENAI_API_KEY=sk-... asistente-ciudadano
```

La imagen corre sin root, con healthcheck integrado y apagado graceful ante `SIGTERM`.

## Documentación

| Documento | Contenido |
|---|---|
| [`specs/01-vision.md`](specs/01-vision.md) | Visión de producto y alcance |
| [`specs/02-requerimientos-funcionales.md`](specs/02-requerimientos-funcionales.md) | Requerimientos con criterios de aceptación |
| [`specs/03-api.md`](specs/03-api.md) + [`openapi.yaml`](specs/openapi.yaml) | Contrato de API |
| [`specs/04-arquitectura.md`](specs/04-arquitectura.md) | Arquitectura y ADRs |
| [`specs/05-seguridad-privacidad.md`](specs/05-seguridad-privacidad.md) | Seguridad, Ley N° 18.331, lineamientos AGESIC |
| [`specs/06-plan-de-pruebas.md`](specs/06-plan-de-pruebas.md) | Estrategia de pruebas y trazabilidad |
| [`specs/07-plataforma-multibot-agentes.md`](specs/07-plataforma-multibot-agentes.md) | Multi-bot, orquestador, agentes y RAG |

## Licencia

MIT — ver [LICENSE](LICENSE).
