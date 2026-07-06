# 03 — Contrato de API

Especificación formal en [openapi.yaml](openapi.yaml). Este documento resume el
contrato y sus reglas transversales.

> La plataforma es **multi-bot** (ver [07](07-plataforma-multibot-agentes.md)). El
> endpoint canónico de chat es `POST /api/v1/bots/:botId/chat`; `POST /api/v1/chat`
> es un atajo al bot por defecto y conserva el contrato descrito abajo. La consulta
> del catálogo se hace por bot en `GET /api/v1/bots/:botId/documents`.

## Reglas generales

- Base path versionado: `/api/v1`. Cambios incompatibles ⇒ nueva versión de path.
- Requests y responses en JSON, UTF-8.
- Todas las respuestas incluyen el header `X-Request-Id` (echo del recibido o generado).
- Errores con formato uniforme:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "El campo 'message' es requerido." } }
```

| Código HTTP | `error.code` | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Entrada inválida |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 413 | `PAYLOAD_TOO_LARGE` | Body mayor al límite (`BODY_LIMIT_KB`, defecto 64 kb) |
| 429 | `RATE_LIMITED` | Límite de solicitudes excedido |
| 500 | `INTERNAL_ERROR` | Error no controlado (sin detalles internos) |

## Endpoints

### POST /api/v1/chat  (RF-01, RF-02, RF-03)

Request:
```json
{
  "message": "¿Qué necesito para habilitar un comercio en Canelones?",
  "history": [
    { "role": "user", "content": "hola" },
    { "role": "assistant", "content": "¡Hola! ¿En qué trámite te puedo ayudar?" }
  ]
}
```

- `message`: string, requerido, 1–1000 caracteres (tras trim).
- `history`: opcional, máx. 20 ítems; cada ítem `{ role: "user"|"assistant", content: string ≤ 2000 }`.

Response `200`:
```json
{
  "reply": "Para la habilitación comercial tipo B en Canelones necesitás…",
  "bot": "canelones-tramites",
  "agentes": [ { "id": "tramites", "nombre": "Trámites y servicios" } ],
  "sources": [ { "id": "habilitacion-comercial-tipo-b", "nombre": "Habilitación comercial Tipo B (Canelones)", "seccion": "Requisitos", "organismo": "Intendencia de Canelones" } ],
  "mode": "ai"
}
```

- `mode`: `"ai"` (respuesta generada por el modelo sobre el contexto recuperado) o
  `"catalog"` (modo degradado extractivo, RF-03/RF-11).
- `agentes`: agentes especialistas consultados (RF-09). `sources`: documentos citados (RF-10).

### GET /api/v1/bots/:botId/documents  (RF-04, RF-08)

Query `q` opcional (filtro de texto). Response `200`:
```json
{ "documents": [ { "id": "…", "titulo": "…", "coleccion": "…", "resumen": "…", "etiquetas": ["…"] } ] }
```

### GET /api/v1/bots/:botId/documents/:docId  (RF-04, RF-08)

Documento completo o `404`.

### POST /api/v1/feedback  (RF-05)

Request: `{ "helpful": true, "comment": "opcional, ≤ 500" }` → Response `204`.

### GET /api/v1/health · GET /api/v1/ready  (RNF-03)

`health`: `200 { "status": "ok", "version": "…" }` siempre que el proceso viva.
`ready`: `200` cuando el catálogo está cargado y válido; `503` en caso contrario.

### POST /ask  (RF-07 — deprecado)

Alias de compatibilidad con la PoC. `{ "message": "…" }` → `200 { "reply": "…" }`
con headers `Deprecation: true` y `Link: </api/v1/chat>; rel="successor-version"`.

## Rate limiting (RNF-02)

- `/api/v1/chat` y `/ask`: `RATE_LIMIT_CHAT_MAX` solicitudes por IP por ventana de `RATE_LIMIT_WINDOW_MS` (defecto: 20 req/min).
- Resto de la API: `RATE_LIMIT_API_MAX` (defecto: 100 req/min).
- Al exceder: `429` con formato de error estándar y header `Retry-After`.
