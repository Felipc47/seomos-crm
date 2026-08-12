---
name: timestamps-ventanas-en-sql
description: Las ventanas de recencia sobre timestamps de Postgres se evalúan en SQL (now() de la BD), nunca comparando con Date.now() en JS.
metadata:
  type: reference
---

Aprendido con el guard anti-repetición del agente (2026-07-20). Comparar un
`created_at` leído por drizzle contra `Date.now()` falló en local: el Postgres
de desarrollo guarda `timestamp` en hora local y el driver lo interpreta con
otra zona → un mensaje de hace 5 segundos aparentaba horas de antigüedad y la
ventana de 15 minutos nunca se cumplía. En prod (contenedor UTC) habría
funcionado "de casualidad".

**Cómo aplicar:** cualquier condición de recencia va en el WHERE con el reloj
de la propia BD, p. ej.
`sql\`${schema.message.createdAt} > now() - make_interval(mins => N)\``
(ver `deliverReply` en `src/server/ai/pipeline.ts`). La igualdad exacta de
timestamps round-trip (escribir Date → leer Date, como
`conversation.meetingScheduledFor`) sí es consistente porque usa el mismo
driver en ambas direcciones.

Para cortes por **fecha calendario del negocio** (Dashboard, 2026-08-12), las
columnas `timestamp without time zone` requieren dos pasos en PostgreSQL:
interpretar el valor en la zona de sesión y luego proyectarlo a la zona del
negocio antes de aplicar `::date`, por ejemplo
`timezone($business_tz, created_at at time zone current_setting('TimeZone'))::date`.
Aplicar `created_at::date` directamente vuelve los límites de Hoy/7d distintos
entre el contenedor UTC y una instalación local con otra zona.
