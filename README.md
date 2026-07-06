# Asistente Ciudadano

Asistente conversacional para sitios web de organismos públicos uruguayos: ayuda a la
ciudadanía a entender **cómo realizar trámites** (requisitos, documentación, costos,
lugares y plazos) respondiendo únicamente sobre un **catálogo curado de trámites**
administrado por el organismo.

[![CI](https://github.com/michel-camarotta/chatbot-gobierno-render/actions/workflows/ci.yml/badge.svg)](https://github.com/michel-camarotta/chatbot-gobierno-render/actions/workflows/ci.yml)

## Características

- 💬 **Chat multi-turno** con retrieval sobre el catálogo: el modelo solo ve trámites
  relevantes a la consulta y tiene prohibido inventar información (SEG-06).
- 🛡️ **Modo degradado sin IA**: sin `OPENAI_API_KEY` (o si el proveedor falla) responde
  con fichas determinísticas del catálogo — el servicio nunca depende de un tercero.
- 🧩 **Widget embebible en una línea**, accesible (WCAG 2.1 AA) y sin dependencias ni
  CDNs de terceros.
- 📚 **Catálogo como fuente de verdad**: archivos JSON validados por schema,
  editables por personal no técnico vía pull request.
- 🔒 **Listo para producción**: headers de seguridad, rate limiting, CORS cerrado por
  defecto, validación estricta de entrada, logs estructurados sin datos personales,
  healthchecks, apagado graceful, API versionada con OpenAPI.
- ✅ **Spec-driven development**: especificaciones versionadas en [`specs/`](specs/)
  con trazabilidad requerimiento → prueba (46 pruebas automatizadas).

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
npm test                # suite completa, sin red ni claves
npm run validate:catalog
npm run dev             # desarrollo con recarga automática
```

## Integración del widget en el sitio del organismo

```html
<script src="https://SU-SERVICIO/widget.js" defer></script>
```

Atributos opcionales: `data-title="Asistente Ciudadano"` y
`data-api-base="https://SU-SERVICIO"` (si el widget se sirve desde otro origen,
agregar ese origen a `CORS_ORIGINS` del servicio).

## API

Base: `/api/v1` — contrato completo en [`specs/openapi.yaml`](specs/openapi.yaml).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/chat` | Consulta conversacional (`message`, `history`) |
| GET | `/api/v1/tramites?q=` | Listado del catálogo con filtro opcional |
| GET | `/api/v1/tramites/:id` | Ficha completa de un trámite |
| POST | `/api/v1/feedback` | Feedback ciudadano (útil / no útil) |
| GET | `/api/v1/health` · `/ready` | Liveness / readiness |
| POST | `/ask` | ⚠️ Deprecado — alias de compatibilidad con la PoC |

## Administrar el catálogo de trámites

Cada trámite es un archivo en [`data/tramites/`](data/tramites/) validado contra
[`data/schema/tramite.schema.json`](data/schema/tramite.schema.json):

1. Crear `data/tramites/mi-tramite.json` (el campo `id` debe coincidir con el nombre
   del archivo). Usar un trámite existente como plantilla.
2. Validar: `npm run validate:catalog` (también corre en CI).
3. Abrir un pull request. Al desplegarse, el asistente lo incorpora automáticamente.

El campo `palabrasClave` mejora la recuperación: incluir los términos que usa la
ciudadanía ("libreta de conducir" además de "licencia").

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

## Licencia

MIT — ver [LICENSE](LICENSE).
