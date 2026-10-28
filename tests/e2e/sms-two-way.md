# SMS Brevo — flujo bidireccional (034)

Con PostgreSQL QA en 5433, migraciones aplicadas y `sms-connection-start.mjs`
en 3110: ejecutar `sms-connection.mjs` y después `sms-two-way.mjs`.
Todas las cuentas, aprobaciones, números y evidencias son ficticias. Los mocks
están cerrados en producción. No se contacta Brevo ni se gastan créditos.

El recorrido conduce Ajustes → SMS y la bandeja: conexión, registro de remitente,
webhook, alta con consentimiento, revisión, confirmación, entrega, respuesta
entrante y contestación. Comprueba deduplicación, eventos tempranos/fuera de orden,
STOP, aislamiento entre empresas, roles, saldo y fallos/timeout del proveedor.
Evidencias locales: `.artifacts/sms/` y `.artifacts/sms-two-way/`.
