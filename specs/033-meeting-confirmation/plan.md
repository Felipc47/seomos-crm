# Plan

1. Tabla meeting tenant-scoped: una fila por contacto, fechas UTC, enlace, zona, origen y estado durable de recordatorio. Migración versionada; backfill conservador solo con fecha existente.
2. Servicio común para guardar/cancelar + integración en scheduleMeeting. Serialización separada del DTO de contacto para evitar alterar consumidores existentes.
3. Endpoint autenticado de reunión por contacto; validación Zod, URL HTTPS y zona IANA. Mantener las notas existentes y el marcador de conversación.
4. Runner integrado en /api/cron/meetings (cada minuto) y /api/cron/sweep (recuperación). Claim SQL condicionado, estado sending persistido antes de red; estancado → incierto sin reenvío. Sin cola ni proveedor adicional. Cambios bloqueados durante sending.
5. Sección Reunión en detalles con editor y estado. Configuración de plantilla por empresa en Agente → Agendamiento.
6. Unit tests de umbral/plantilla/texto y E2E Playwright + WhatsApp/Calendar mocks con BD nueva. Gate typecheck/lint/build/test.

## Constitución / análisis
Aislamiento scoped() por empresa; secretos solo en adaptadores existentes; sin nuevas credenciales; cron existente; claim durable e idempotencia; sandbox preservado. Guardar sin cambios no rearma envíos. Resultado incierto privilegia no duplicar. APIs y UX cubren los criterios de la especificación.
