# 06 — Plan de pruebas

## Estrategia

- **Runner**: `node:test` nativo (Node ≥ 20), sin frameworks externos.
- **Nivel principal**: pruebas de integración sobre la app Express real (levantada en
  puerto efímero) usando `fetch` — verifican el contrato de la API tal como lo ve un
  cliente.
- **Unitarias**: RAG, orquestador, validación de config y validación de bots/documentos.
- **Sin red ni secretos**: la suite corre sin `OPENAI_API_KEY` (ejercita el modo
  extractivo) y con un proveedor falso inyectado para el modo IA. `npm test` debe pasar
  en cualquier máquina limpia (RNF-06).
- **CI**: GitHub Actions ejecuta `npm ci && npm test` y `npm audit` en cada push y PR.

## Matriz de trazabilidad

| Requerimiento | Pruebas |
|---|---|
| RF-01 Chat: contrato y validación | `test/chat.test.js` — respuestas 200, 400 por mensaje vacío/largo/no-string, historial malformado |
| RF-02 / RF-10 Retrieval y RAG | `test/rag.test.js` — relevancia, insensibilidad a tildes/mayúsculas, filtro por colección, top-K, umbral (sin resultados) |
| RF-03 Modo degradado | `test/chat.test.js` — sin API key → `mode: "catalog"`; proveedor que falla → degradación sin 5xx; proveedor OK → `mode: "ai"` |
| RF-04 Base de conocimiento | `test/bots.test.js` — listado de documentos, filtro `?q=`, ficha por id, 404 |
| RF-05 Feedback | `test/feedback.test.js` — 204, validación de body |
| RF-07 Alias legacy | `test/legacy.test.js` — `/ask` responde `{reply}` con header `Deprecation` |
| RF-08..11 Multi-bot, agentes, RAG | ver matriz en [07-plataforma-multibot-agentes.md](07-plataforma-multibot-agentes.md): `test/bots.test.js`, `test/botsLoader.test.js`, `test/orchestrator.test.js`, `test/rag.test.js` |
| RNF-02 Seguridad | `test/security.test.js` — headers de seguridad presentes, 413 por payload grande, historial válido máximo sin 413, formato de error uniforme, 429 al exceder rate limit |
| RNF-03 Observabilidad | `test/health.test.js` — `/health`, `/ready`, `X-Request-Id` en respuestas |
| RNF-04 Configuración | `test/config.test.js` — defaults, parseo, error claro ante valores inválidos |

## Criterio de salida

- 100 % de las pruebas en verde en CI.
- Cada RF/RNF de la tabla cubierto por al menos un caso.
- `npm audit --omit=dev` sin vulnerabilidades altas o críticas conocidas.

## Pruebas manuales de accesibilidad (RNF-01)

Checklist por release: navegación completa por teclado, lectura con lector de
pantalla (NVDA/VoiceOver) del flujo abrir → preguntar → respuesta → cerrar,
contraste verificado, animaciones desactivadas con `prefers-reduced-motion`.
