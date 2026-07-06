# 02 — Requerimientos

Cada requerimiento tiene criterios de aceptación verificables. La matriz de
trazabilidad requerimiento → prueba está en [06-plan-de-pruebas.md](06-plan-de-pruebas.md).

> Estos requerimientos base se sirven dentro de la **plataforma multi-bot** descrita en
> [07-plataforma-multibot-agentes.md](07-plataforma-multibot-agentes.md) (RF-08..11). El
> endpoint canónico de chat es `POST /api/v1/bots/:botId/chat`; `POST /api/v1/chat` es un
> atajo al bot por defecto que conserva el contrato de RF-01. La "base de conocimiento"
> de cada bot cumple el rol que antes tenía el catálogo único de trámites.

## Requerimientos funcionales

### RF-01 — Consulta conversacional
El sistema expone `POST /api/v1/chat` que recibe un mensaje del ciudadano y el
historial reciente de la conversación, y devuelve una respuesta en español.

**Criterios de aceptación**
- Acepta `message` (string, 1–1000 caracteres) e `history` opcional (hasta 20 turnos previos).
- Responde `200` con `{ reply, sources, mode }`.
- `sources` lista los IDs de trámites del catálogo usados para fundamentar la respuesta.
- Rechaza con `400` y detalle del error: mensaje vacío, no-string, mayor a 1000 caracteres, o historial malformado.

### RF-02 — Respuestas fundadas en el catálogo (retrieval)
Antes de generar la respuesta, el sistema selecciona del catálogo los trámites más
relevantes al mensaje (búsqueda léxica con normalización de tildes y sinónimos) y
solo esos se entregan como contexto al modelo.

**Criterios de aceptación**
- Una consulta por "habilitación comercial" recupera el trámite correspondiente como fuente.
- La búsqueda es insensible a mayúsculas y tildes ("cedula" encuentra "cédula").
- Se entregan al modelo como máximo `RETRIEVAL_TOP_K` trámites (defecto: 3).
- Si ningún trámite supera el umbral de relevancia, el sistema responde indicando que no tiene información y deriva a canales oficiales, sin inventar contenido.

### RF-03 — Modo degradado sin proveedor de IA
Si no hay proveedor de IA configurado, o el proveedor falla o excede el timeout, el
sistema responde igualmente con información determinística del catálogo.

**Criterios de aceptación**
- Sin `OPENAI_API_KEY`, `POST /api/v1/chat` responde `200` con `mode: "catalog"` y una respuesta extractiva legible del documento más relevante.
- Ante error del proveedor, se degrada a `mode: "catalog"` en la misma solicitud (sin error 5xx para el ciudadano).
- Con proveedor operativo, `mode` es `"ai"`.

### RF-04 — Base de conocimiento consultable
El sistema expone la base de conocimiento de cada bot en
`GET /api/v1/bots/:botId/documents` (listado resumido con filtro de texto opcional
`?q=`) y `GET /api/v1/bots/:botId/documents/:docId` (documento completo).

**Criterios de aceptación**
- El listado devuelve `id`, `titulo`, `coleccion`, `resumen`, `etiquetas` de cada documento.
- `:botId` o `:docId` inexistente responde `404` con formato de error estándar.
- Cada documento se valida contra su JSON Schema al arrancar el servicio; un documento o `bot.json` inválido impide el arranque con un error descriptivo (ver RF-08).

### RF-05 — Feedback ciudadano
`POST /api/v1/feedback` registra si una respuesta fue útil.

**Criterios de aceptación**
- Acepta `helpful` (boolean, requerido) y `comment` (string ≤ 500, opcional).
- Se registra en el log estructurado con el request ID de la conversación (sin datos personales adicionales).
- Responde `204`.

### RF-06 — Widget web embebible
El frontend es un widget flotante que se integra agregando un `<script>` y un
contenedor al sitio del organismo.

**Criterios de aceptación**
- Sin dependencias externas (sin CDNs, fuentes ni íconos de terceros).
- Botón flotante que abre/cierra el panel de chat; estado inicial cerrado.
- Indicador de "escribiendo…" mientras se espera la respuesta.
- Errores de red se muestran como mensaje del asistente con opción de reintentar, nunca rompen el widget.
- Muestra las fuentes (trámites) de cada respuesta cuando existen.
- Aviso visible de que las respuestas son informativas y no constituyen resolución administrativa.

### RF-07 — Compatibilidad con integraciones existentes
`POST /ask` (contrato de la PoC) se mantiene como alias deprecado de `/api/v1/chat`.

**Criterios de aceptación**
- `POST /ask` con `{ message }` responde `200` con `{ reply }`.
- La respuesta incluye el header `Deprecation: true` y `Link` al endpoint nuevo.

## Requerimientos no funcionales

### RNF-01 — Accesibilidad (WCAG 2.1 AA)
Roles ARIA correctos (`log`, `dialog`), navegable por teclado (abrir, escribir,
enviar, cerrar con Escape), foco gestionado al abrir/cerrar, contraste ≥ 4.5:1,
`prefers-reduced-motion` respetado.

### RNF-02 — Seguridad
Ver [05-seguridad-privacidad.md](05-seguridad-privacidad.md). Resumen: headers de
seguridad (helmet), rate limiting por IP, CORS restringido por configuración,
validación estricta de entrada, sin secretos en el código ni en el repositorio.

### RNF-03 — Observabilidad
Logs estructurados JSON (un evento por línea) con `requestId`, latencia y modo de
respuesta; `GET /api/v1/health` (liveness) y `GET /api/v1/ready` (readiness).
Sin contenido de mensajes de ciudadanos en logs de nivel `info` (ver SEG-05).

### RNF-04 — Configuración por entorno
Toda la configuración es por variables de entorno, validadas al arranque con
mensajes de error claros. Valores por defecto seguros. Documentada en `.env.example`.

### RNF-05 — Disponibilidad y resiliencia
Timeout configurable hacia el proveedor de IA (defecto 15 s), degradación a modo
catálogo ante fallas (RF-03), apagado graceful ante `SIGTERM`/`SIGINT` (Render,
Docker y Kubernetes envían `SIGTERM`).

### RNF-06 — Calidad verificable
Suite de pruebas automatizadas ejecutable con `npm test` sin red ni claves de API;
CI que corre las pruebas en cada push y pull request.

### RNF-07 — Idioma
Toda interfaz, respuesta y mensaje de error visible al ciudadano está en español.
