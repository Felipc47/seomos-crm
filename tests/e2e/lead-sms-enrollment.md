# 044 — Alta SMS desde Meta y Sheets

Usar PostgreSQL local `seomos_leadsms_044` y puerto 3114. Aplicar migraciones con `DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seomos_leadsms_044 ./node_modules/.bin/drizzle-kit migrate`, iniciar `node tests/e2e/lead-sms-enrollment-start.mjs` y ejecutar `node tests/e2e/lead-sms-enrollment.mjs`.

El guion usa únicamente proveedores mock y números ficticios US. Ejerce la configuración por UI, Meta y Sheets, saludo WhatsApp, envío SMS por Brevo mock, reintentos, bajas, bloqueo y tenant ajeno. Evidencia en `.artifacts/lead-sms-044/results.json`.
