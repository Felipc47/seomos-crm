# US44 — Reunión del prospecto y confirmación previa

Reproducir exclusivamente en una copia local del repo sin `.env` real y con base
`seomos_meeting_033` en PostgreSQL local:5433. Crear la base y aplicar migraciones
con DATABASE_URL explícita; nunca borrar ni migrar una base de producción.

1. Iniciar `node tests/e2e/us44-meeting-start.mjs` (puerto 3104, proveedores ficticios).
2. Sobre una base de prueba nueva, ejecutar `node tests/e2e/us44-meeting.mjs`.
3. La prueba registra el admin desde UI, configura WhatsApp/Calendar mock, conduce
   registro/edición/retiro de reunión, móvil y Google manual/IA. Simula el tiempo
   solo a través del cron con mocks. Comprueba el mensaje en chat y outbox, no solo
   HTTP o filas de BD. Repetir sobre una base aislada limpia; los mocks se limpian
   al inicio. No activar los mocks en producción.

Cobertura: umbral exacto -45 min, registro dentro del umbral, reprogramación,
idempotencia al guardar y togglear un envío enviado, cron concurrente dedicado y
recuperación, plantilla UTILITY/no plantilla, baja/bloqueo/archivo/sandbox,
proveedor fallido, recuperación de claim interrumpido, empresa retirada,
aislamiento, backfill repetible, interpretación de hora empresarial desde
navegador en Asia/Tokyo, móvil y sección de Contactos.

Salida: `.artifacts/us44-meeting/{desktop,mobile}.png`.
Evidencia final conservada en `specs/033-meeting-confirmation/evidence/`.
