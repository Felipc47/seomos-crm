# SMS Brevo — Bandeja unificada y flujo bidireccional (034)

Con PostgreSQL QA en 5433, migraciones aplicadas y `sms-connection-start.mjs`
en 3110: ejecutar `sms-connection.mjs` y después `sms-two-way.mjs`.
Todas las cuentas, aprobaciones, números y evidencias son ficticias. Los mocks
están cerrados en producción. No se contacta Brevo ni se gastan créditos.

El recorrido conduce Ajustes → SMS → Bandeja. Comprueba el acceso compatible
`/sms`, la lista mezclada y cronológica de WhatsApp y SMS, pills visibles,
filtros Todos/WhatsApp/SMS, búsqueda por mensaje reciente y navegación móvil.
En el hilo SMS comprueba alta con consentimiento, revisión, confirmación,
entrega, respuesta entrante, contestación, deduplicación, eventos tempranos/fuera
de orden y STOP. También comprueba aislamiento entre empresas, roles, saldo y
fallos/timeout del proveedor. Las acciones masivas siguen limitadas a WhatsApp.
Evidencias locales: `.artifacts/sms/` y `.artifacts/sms-two-way/`.
