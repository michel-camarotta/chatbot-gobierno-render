# 07 — Plataforma multi-bot, agentes y RAG

Extiende la arquitectura (04) para convertir el servicio en una **plataforma**: un
mismo motor sirve **muchos chatbots**, uno por dominio u organismo (trámites de una
intendencia, sanidad animal del MGAP, salud, educación, etc.). Cada chatbot tiene
detrás un **orquestador** que consulta a un **conjunto de agentes especialistas**,
y todos responden mediante **RAG** sobre bases de conocimiento curadas.

## Conceptos

- **Bot**: un asistente configurado para un dominio. Tiene identidad (nombre,
  organismo, saludo, disclaimer), una base de conocimiento y un conjunto de agentes.
  Se define en `data/bots/<botId>/bot.json`.
- **Colección**: un grupo temático de documentos dentro de un bot
  (`data/bots/<botId>/knowledge/<coleccion>/*.json`). Ej.: `enfermedades`,
  `protocolos`, `controles`, `normativa`.
- **Documento**: unidad de conocimiento curada (ficha de enfermedad, protocolo,
  trámite). Se valida contra `data/schema/documento.schema.json` y se divide en
  **secciones** que son la unidad de recuperación (chunks).
- **Agente especialista**: subdominio del bot. Declara qué colecciones cubre y qué
  palabras clave lo caracterizan. Ej.: "Enfermedades" cubre `enfermedades`,
  "Protocolos de aviso" cubre `protocolos`.
- **Orquestador**: por cada consulta, rutea a los agentes pertinentes, reúne los
  fragmentos que cada uno recupera de sus colecciones, y compone una única respuesta
  fundada con citas. Es el "cerebro" del bot; los agentes son sus especialistas.

```
Ciudadano ──▶ Bot (mgap-ganado)
                 │
                 ▼
            Orquestador ── rutea por relevancia ──▶ Agente Enfermedades ─▶ RAG(enfermedades)
                 │                               ├▶ Agente Protocolos   ─▶ RAG(protocolos)
                 │                               ├▶ Agente Controles    ─▶ RAG(controles)
                 │                               └▶ Agente Normativa    ─▶ RAG(normativa)
                 ▼
       Respuesta fundada + fuentes citadas + agentes consultados
```

## Requerimientos

### RF-08 — Multi-bot configurable
El servicio carga todos los bots de `data/bots/` al arranque. Agregar un bot nuevo
para cualquier sector del Estado es crear un directorio con su `bot.json` y sus
documentos — sin tocar código.

**Criterios de aceptación**
- `GET /api/v1/bots` lista los bots disponibles (id, nombre, organismo, descripción, agentes).
- `GET /api/v1/bots/:botId` devuelve el detalle (agentes y colecciones) o `404`.
- `POST /api/v1/bots/:botId/chat` conversa con ese bot; `:botId` inexistente ⇒ `404`.
- Un `bot.json` o documento inválido impide el arranque con un error que nombra el archivo.

### RF-09 — Orquestación por agentes
El orquestador de cada bot selecciona los agentes relevantes a la consulta y combina
sus recuperaciones.

**Criterios de aceptación**
- La respuesta incluye `agentes`: los agentes efectivamente consultados.
- Una consulta claramente de un subdominio (ej. "¿a quién aviso si sospecho aftosa?")
  activa el agente correspondiente (protocolos) como principal.
- Si ningún agente supera el umbral de relevancia, el bot deriva a los canales
  oficiales sin inventar (ver RF-11).

### RF-10 — RAG (Retrieval-Augmented Generation)
Cada agente recupera las **secciones** más relevantes de sus colecciones y solo esas
se entregan como contexto al modelo. La respuesta cita las fuentes usadas.

**Criterios de aceptación**
- La respuesta incluye `sources` con los documentos citados (id, título, sección, organismo).
- El contexto entregado al modelo contiene únicamente fragmentos recuperados, nunca la base completa.
- La recuperación es insensible a tildes y mayúsculas y respeta el umbral de relevancia.

### RF-11 — Fundamentación y anti-alucinación
El sistema no debe afirmar información que no esté en la base de conocimiento.

**Criterios de aceptación**
- Con proveedor de IA: el prompt de sistema restringe al modelo a los fragmentos
  recuperados y le exige derivar a canales oficiales cuando no alcanzan (SEG-06).
- Sin proveedor de IA (modo degradado): la respuesta es **extractiva** — se compone
  citando textualmente las secciones recuperadas, por lo que no hay generación libre
  y es imposible alucinar por construcción.
- Toda respuesta fundada expone sus `sources`, lo que permite auditar de dónde salió
  cada afirmación.
- Consultas sin fragmentos relevantes nunca producen una respuesta inventada.

## Cómo se evita la alucinación (resumen de mecanismos)

1. **Recuperar antes de responder (RAG)**: el modelo solo ve los fragmentos curados
   recuperados para esa consulta, no conocimiento paramétrico abierto.
2. **Prompt restringido**: "respondé únicamente con el CONTEXTO; si no alcanza, decilo
   y derivá al canal oficial". El mensaje del usuario se trata como dato, no instrucción.
3. **Umbral de relevancia**: por debajo del umbral no se responde; se deriva.
4. **Citas obligatorias**: cada respuesta lista sus fuentes → auditable y trazable.
5. **Modo degradado extractivo**: sin IA se devuelve el texto curado tal cual (cero
   riesgo de invención); útil además como piso de disponibilidad (RNF-05).
6. **Agentes acotados**: cada especialista recupera solo dentro de sus colecciones,
   reduciendo ruido de contexto y respuestas fuera de dominio.

> Nota sobre la recuperación: v1 usa recuperación **léxica** (ADR-03) por su
> determinismo y cero dependencias. La interfaz de RAG (`search(query) → chunks`)
> permite sustituirla por **embeddings/búsqueda vectorial** sin cambiar el
> orquestador ni el resto del sistema (ADR-07).

## ADR-07 — RAG con interfaz de recuperación intercambiable
El orquestador depende de una interfaz `rag.search({ query, colecciones })` que
devuelve fragmentos con metadatos de origen. La implementación léxica actual puede
reemplazarse por una vectorial (por bot o por colección) sin afectar contratos.

## Trazabilidad (complementa 06)

| Requerimiento | Pruebas |
|---|---|
| RF-08 Multi-bot | `test/bots.test.js` — listado, detalle, 404, chat por bot |
| RF-09 Orquestación | `test/orchestrator.test.js` — ruteo a agente correcto, `agentes` en respuesta |
| RF-10 RAG | `test/rag.test.js` — recuperación por colección, tildes, umbral, citas |
| RF-11 Anti-alucinación | `test/orchestrator.test.js` — sin coincidencias deriva; modo extractivo cita fuentes; contexto acotado |
