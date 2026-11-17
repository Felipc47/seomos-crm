# Paridad del agente SMS — E2E

Con PostgreSQL QA `seomos_sms_034` en `127.0.0.1:5433`, aplicar migraciones y arrancar `node tests/e2e/sms-connection-start.mjs` en `127.0.0.1:3110`. Ejecutar `node tests/e2e/sms-agent-parity.mjs`.

Usa únicamente los mocks internos de Brevo y OpenRouter. El guion crea un lead de prueba consentido y verifica oferta de dos horarios, confirmación sin reserva prematura, nota, etapa, seguimiento programado y enviado por SMS, reunión en CRM, derivación con asignación y notificación, estado de Bandeja, reactivación y salida inválida del proveedor.
