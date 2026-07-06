# Especificaciones — Asistente Ciudadano

Este proyecto se desarrolla bajo **Spec-Driven Development (SDD)**: toda funcionalidad
nace de una especificación versionada en este directorio, se implementa contra ella y
se verifica con pruebas trazables a sus requerimientos.

## Índice

| Documento | Contenido |
|---|---|
| [01-vision.md](01-vision.md) | Visión de producto, alcance, usuarios y objetivos |
| [02-requerimientos-funcionales.md](02-requerimientos-funcionales.md) | Requerimientos funcionales y no funcionales con criterios de aceptación |
| [03-api.md](03-api.md) | Contrato de la API REST (complementado por [openapi.yaml](openapi.yaml)) |
| [04-arquitectura.md](04-arquitectura.md) | Arquitectura técnica y decisiones de diseño (ADRs) |
| [05-seguridad-privacidad.md](05-seguridad-privacidad.md) | Seguridad, protección de datos (Ley N° 18.331) y lineamientos AGESIC |
| [06-plan-de-pruebas.md](06-plan-de-pruebas.md) | Estrategia de pruebas y trazabilidad requerimiento → test |

## Proceso

1. **Especificar**: todo cambio de comportamiento se documenta primero acá (requerimiento con ID, ej. `RF-03`).
2. **Implementar**: el código referencia los IDs de requerimiento que satisface.
3. **Verificar**: cada requerimiento tiene al menos una prueba automatizada asociada (ver matriz de trazabilidad en `06-plan-de-pruebas.md`).
4. **Revisar**: los cambios a specs se revisan en el mismo pull request que el código.

## Convenciones de IDs

- `RF-xx` — requerimiento funcional
- `RNF-xx` — requerimiento no funcional
- `ADR-xx` — decisión de arquitectura
- `SEG-xx` — control de seguridad
