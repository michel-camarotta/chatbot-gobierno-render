# 05 — Seguridad y privacidad

Marco de referencia: Ley N° 18.331 de Protección de Datos Personales (Uruguay) y su
decreto reglamentario, lineamientos del Marco de Ciberseguridad de AGESIC, y OWASP
ASVS nivel 1 como piso técnico.

## Principios

1. **Minimización de datos**: el servicio no requiere ni solicita datos personales
   para operar. No hay registro de usuarios, cookies de seguimiento ni analítica de
   terceros.
2. **No persistencia de conversaciones**: el servidor es stateless (ADR-01); las
   conversaciones no se almacenan en disco ni en base de datos.
3. **Transparencia**: el widget informa que es un asistente automatizado y que sus
   respuestas son informativas, no vinculantes.

## Controles

### SEG-01 — Validación estricta de entrada
Todo input se valida por tipo, longitud y forma antes de procesarse (RF-01). Body
limitado a 32 kb. Sin `eval`, sin construcción dinámica de consultas.

### SEG-02 — Rate limiting
Límite por IP en endpoints de chat (defecto 20 req/min) y generales (100 req/min),
con `TRUST_PROXY` configurable para operar detrás de un proxy/CDN sin permitir
suplantación de IP.

### SEG-03 — Headers de seguridad y CORS
`helmet` con Content-Security-Policy restrictiva para la demo (solo `'self'`),
`X-Content-Type-Options`, etc. CORS: por defecto solo same-origin; orígenes
adicionales se habilitan explícitamente vía `CORS_ORIGINS` (lista separada por
comas). `x-powered-by` deshabilitado.

### SEG-04 — Gestión de secretos
Secretos únicamente por variables de entorno; `.env` en `.gitignore`; `.env.example`
sin valores reales. La clave del proveedor de IA nunca llega al navegador: el widget
solo habla con este backend.

### SEG-05 — Logs sin datos personales
Los logs de nivel `info` registran metadatos (request ID, ruta, latencia, modo,
cantidad de fuentes) pero **no** el contenido de los mensajes del ciudadano. El
contenido solo puede aparecer en nivel `debug`, desactivado en producción.

### SEG-06 — Mitigación de inyección de prompt y alucinaciones
El prompt de sistema restringe al modelo a la información del catálogo recuperada,
instruye a rechazar pedidos de cambiar de rol o de revelar instrucciones, y a derivar
a canales oficiales cuando no hay información. El mensaje del usuario se delimita
como dato, no como instrucción. `sources` en la respuesta permite auditar en qué se
fundó cada respuesta.

### SEG-07 — Errores sin fuga de información
Los errores 5xx devuelven un mensaje genérico; stack traces y detalles internos solo
van al log del servidor.

### SEG-08 — Transferencia a terceros (proveedor de IA)
Cuando hay proveedor configurado, el mensaje del ciudadano se envía al proveedor para
generar la respuesta. Esto debe declararse en la política de privacidad del organismo.
Alternativas contempladas: operar en modo catálogo (sin tercero) o usar un proveedor
con residencia de datos acordada. El timeout y la degradación evitan dependencia
operativa (RNF-05).

### SEG-09 — Supply chain
Dependencias mínimas y fijadas (`package-lock.json`); `npm audit` en CI; sin
dependencias de terceros en el frontend (ADR-06).

## Cumplimiento Ley 18.331 — resumen

| Obligación | Cómo se cumple |
|---|---|
| Minimización y finalidad | No se recolectan datos personales; conversaciones no persistidas |
| Seguridad de los datos | Controles SEG-01..09; TLS provisto por la plataforma de despliegue |
| Información al titular | Aviso en el widget; política de privacidad del organismo (SEG-08) |
| Transferencias | Documentadas en SEG-08; modo catálogo disponible como alternativa |
