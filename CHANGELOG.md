# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

## [1.1.0] — 2026-07-06

Convierte el servicio en una **plataforma multi-bot** con orquestador de agentes y RAG.

### Agregado
- Spec `07-plataforma-multibot-agentes.md`: multi-bot, orquestador, agentes y RAG,
  con requerimientos RF-08..11 y ADR-07 (recuperación intercambiable).
- Modelo de datos por bot: `data/bots/<botId>/bot.json` + `knowledge/<coleccion>/*.json`,
  con schemas `bot.schema.json` y `documento.schema.json`.
- Orquestador por bot (`orchestrator.js`): rutea la consulta a los agentes
  especialistas pertinentes y combina sus recuperaciones.
- RAG por colección (`rag.js`): recuperación léxica sobre las secciones de los
  documentos; cada respuesta cita sus fuentes (documento y sección).
- Respuesta extractiva fundada (`groundedAnswer.js`) para el modo sin IA: se compone
  citando el conocimiento curado, sin generación libre (anti-alucinación por construcción).
- API multi-bot: `GET /api/v1/bots`, `GET /api/v1/bots/:botId`,
  `POST /api/v1/bots/:botId/chat`, `GET /api/v1/bots/:botId/documents[/:docId]`.
- **Bot de ejemplo `mgap-ganado`** (sanidad animal del MGAP) con 4 agentes
  (enfermedades, protocolos, controles, normativa) y 13 documentos: fiebre aftosa,
  brucelosis, tuberculosis, garrapata/tristeza parasitaria, carbunco, rabia, denuncia
  obligatoria, medidas ante sospecha, vacunación antiaftosa, control de garrapata,
  saneamiento, DICOSE/SNIG/trazabilidad y guía de tránsito.
- Widget seleccionable por bot con `data-bot-id`; segunda página de demostración
  (`ganado.html`).
- Respuesta de chat ampliada: `bot`, `agentes` (consultados) y `sources` con sección
  y organismo. Nuevos tests de RAG, orquestador, multi-bot y loader de bots (54 en total).

### Cambiado
- El bot de trámites de Canelones pasó a ser el bot `canelones-tramites` dentro de la
  plataforma; sigue siendo el bot por defecto (`DEFAULT_BOT`) de `/api/v1/chat` y `/ask`.
- La base de conocimiento usa el modelo unificado de documentos con secciones.

### Eliminado
- Endpoints `/api/v1/tramites` y `/api/v1/tramites/:id` (reemplazados por
  `/api/v1/bots/:botId/documents`). El schema `tramite.schema.json` y `data/tramites/`
  se migraron a `data/bots/canelones-tramites/`.

## [1.0.0] — 2026-07-06

Reescritura completa de la PoC a un producto listo para producción, bajo
spec-driven development (especificaciones en `specs/`).

### Agregado
- Especificaciones versionadas: visión, requerimientos (RF/RNF), contrato de API
  (OpenAPI 3.0), arquitectura (ADRs), seguridad/privacidad (Ley N° 18.331,
  lineamientos AGESIC) y plan de pruebas con matriz de trazabilidad.
- API REST versionada `/api/v1`: `chat`, `tramites`, `feedback`, `health`, `ready`.
- Retrieval léxico sobre el catálogo: el modelo solo recibe los trámites relevantes
  a la consulta (RF-02) en lugar del catálogo completo.
- Modo degradado sin proveedor de IA: respuestas determinísticas desde el catálogo
  ante ausencia de clave, error o timeout del proveedor (RF-03).
- Catálogo de trámites en `data/tramites/` (7 trámites) validado por JSON Schema al
  arranque y en CI (`npm run validate:catalog`).
- Widget embebible reescrito: accesible (ARIA, teclado, foco, reduced-motion), sin
  dependencias ni CDNs, con indicador de escritura, reintento ante errores, fuentes
  de cada respuesta, feedback y aviso legal.
- Seguridad: helmet con CSP, rate limiting por IP, CORS cerrado por defecto,
  validación estricta de entrada, límite de payload configurable (`BODY_LIMIT_KB`,
  defecto 64 kb, dimensionado para el historial máximo válido), request IDs, errores
  con formato uniforme sin fuga de detalles.
- Observabilidad: logs estructurados JSON (pino) sin contenido de mensajes en nivel
  info, healthchecks de liveness/readiness.
- 46 pruebas automatizadas (`node:test`) que corren sin red ni claves; CI en GitHub
  Actions (Node 20 y 22) con auditoría de dependencias.
- Dockerfile multi-stage (usuario sin root, healthcheck), `render.yaml`, `.env.example`
  documentado, apagado graceful.

### Cambiado
- `POST /ask` se mantiene como alias **deprecado** de `/api/v1/chat` (headers
  `Deprecation` y `Link`); ahora valida la entrada como el endpoint nuevo.
- El widget deja de apuntar a una URL hardcodeada: usa el origen desde el que se
  sirve (`data-api-base` para otros orígenes).

### Eliminado
- Envío del catálogo completo dentro del prompt en cada consulta.
- Íconos servidos desde CDNs de terceros.
- `backend/index.js`, `backend/openaiClient.js` y `backend/tramites.json` de la PoC.

## [0.x] — PoC

MVP inicial: Express de un solo archivo con endpoint `/ask` y widget básico.
