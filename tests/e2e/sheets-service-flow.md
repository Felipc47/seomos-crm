# 043 — Servicio y bienvenida desde Sheets

Harness aislado: PostgreSQL local `seomos_sheets_043`, Next puerto 3113, WhatsApp/IA/Sheets/Resend simulados. Nunca usar datos, tokens ni destinatarios reales.

1. Aplicar migraciones con DATABASE_URL del harness.
2. `node tests/e2e/sheets-service-flow-start.mjs`.
3. `node tests/e2e/sheets-service-flow.mjs` (Playwright Chrome).

Ejercita selector y sincronización desde UI; email con servicio; plantilla, variables y conversación; historial sin retroactividad; Meta primero, Sheets primero y carrera; dos fuentes concurrentes; reserva en curso y resultado incierto; historial anterior a la migración; replay tras caída; envío manual posterior; baja, archivo, bloqueo, servicio manual preservado; fallo independiente de ambos proveedores; cola persistente aun con lectura de Sheets fallida; cron; respuesta del lead y derivación al responsable del servicio; tenant y móvil.

Evidencia ignorada por Git: `.artifacts/sheets-043/results.json`, desktop.png y mobile.png. Complementar con regresión `sheets-contacts.mjs` (042) y gate técnico completo. Una corrida fallida puede dejar fixtures; los IDs de empresa/canal y salidas están aislados por corrida. Reiniciar solo el devserver si se alcanza el límite de login (no cambiar el limitador).
