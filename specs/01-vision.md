# 01 — Visión de producto

## Resumen

**Asistente Ciudadano** es un asistente conversacional embebible en los sitios web de
organismos públicos uruguayos (intendencias, ministerios, unidades ejecutoras) que
ayuda a la ciudadanía a entender **cómo realizar trámites públicos**: requisitos,
documentación, costos, lugares, horarios y plazos.

Responde únicamente sobre la base de un **catálogo curado de trámites** administrado
por el organismo. Cuando no encuentra información, lo dice explícitamente y deriva a
los canales oficiales — nunca inventa requisitos ni plazos.

## Problema

- La información de trámites está dispersa en portales extensos y con lenguaje técnico.
- Los canales telefónicos y presenciales se saturan con consultas repetitivas.
- Los buscadores internos exigen conocer el nombre exacto del trámite.

## Propuesta de valor

| Para | Valor |
|---|---|
| Ciudadanía | Respuestas claras, en español, paso a paso, 24/7, desde el sitio oficial |
| Organismo | Descongestión de canales de atención; catálogo de trámites como única fuente de verdad, editable sin tocar código |
| Equipo TI | Widget de una línea para integrar; API documentada; despliegue en contenedor; sin dependencia de una base de datos para operar |

## Usuarios

1. **Ciudadano/a** (usuario final): consulta trámites desde el sitio del organismo, en desktop o móvil, incluyendo usuarios de tecnologías asistivas.
2. **Administrador de contenido**: mantiene el catálogo de trámites (archivos JSON validados por schema).
3. **Operador TI**: despliega, monitorea (healthchecks, logs estructurados) y configura el servicio por variables de entorno.

## Alcance de esta versión (v1)

**Incluye**
- Chat conversacional con contexto de la conversación (multi-turno).
- Recuperación de trámites relevantes del catálogo (retrieval) y generación de respuesta fundada solo en ellos.
- Modo degradado sin proveedor de IA: respuestas determinísticas desde el catálogo (el servicio nunca queda fuera de línea por falta o falla del proveedor).
- Widget web embebible, accesible (WCAG 2.1 AA) y sin dependencias de terceros.
- API REST versionada y documentada (OpenAPI).
- Endpoint de feedback ciudadano (útil / no útil).
- Observabilidad: logs estructurados JSON, healthchecks, request IDs.

**No incluye (versiones futuras)**
- Inicio o seguimiento de trámites (integración con gub.uy / ID Uruguay).
- Panel de administración web del catálogo.
- Persistencia de conversaciones en base de datos.
- Canales adicionales (WhatsApp, telefónico).

## Métricas de éxito

- ≥ 70 % de las consultas resueltas sin derivación a canal humano (medido por feedback).
- Tiempo de respuesta P95 < 5 s con proveedor de IA; < 300 ms en modo degradado.
- 0 respuestas con información de trámites no presente en el catálogo (alucinaciones).
