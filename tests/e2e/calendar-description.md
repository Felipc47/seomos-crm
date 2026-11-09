# 041 — Descripción editable de las invitaciones

Base exclusivamente local `seomos_calendar_description_041` en PostgreSQL :5433.
Aplicar las migraciones y arrancar `node tests/e2e/calendar-description-start.mjs`;
ejecutar `node tests/e2e/calendar-description.mjs` desde este checkout.

El guion conduce registro, calendario e inbox con Playwright y las API reales con
WhatsApp, LLM y Google mock. Comprueba persistencia multilinea, datos del contacto,
agendamiento manual y por el agente, texto vacío, compatibilidad heredada, límite,
permisos, aislamiento entre empresas, fallo recuperable de guardado y vista móvil.
La evidencia queda en `.artifacts/calendar-description/`. No usa cuentas reales.
