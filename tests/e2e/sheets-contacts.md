# Google Sheets — self-test 042

Base local exclusiva seomos_sheets_042, PostgreSQL :5433; aplicar migraciones.
Iniciar node tests/e2e/sheets-contacts-start.mjs y ejecutar node tests/e2e/sheets-contacts.mjs.
Chrome headless y mocks WhatsApp/IA/Google/Sheets. Empresas e identidades ficticias, sin proveedores reales de mensajes.
37 comprobaciones: alta UI, formato Meta, notas, repetición, edición manual, eliminación de fila en origen, conflicto de teléfono, fallo proveedor, pausa/reanudación/intervalo, cron, fila nueva con refresco en vivo, concurrencia, aislamiento tenant/admin, suspensión y preservación de otras conexiones.
Evidencia en .artifacts/sheets-042/. Reiniciar solo servidor local entre múltiples ejecuciones para respetar el limitador de logins. No ejecutar build con dev abierto: comparten .next.
