# Regresión: agendar sin Google Calendar

Usar exclusivamente BD local nueva seomos_calendar_optional_004, puerto 3106.
Aplicar las migraciones existentes con DATABASE_URL explícita. Nunca usar
producción. Los launchers llevan valores de prueba ficticios y mocks internos.

1. Ejecutar node tests/e2e/calendar-optional-start.mjs.
2. Ejecutar node tests/e2e/calendar-optional.mjs: 32 comprobaciones.
3. Detener el servidor y arrancar con E2E_GOOGLE_CONFIGURED=false.
4. Ejecutar también el test con E2E_GOOGLE_CONFIGURED=false: 19 comprobaciones.
5. Detener el servidor antes de next build (comparten .next).

El test controla la UI de Agente/Bandeja, ingresa mensajes WhatsApp mediante
el mock y observa respuestas, registros, etapa y recordatorios. Abarca oferta
sin cuenta, correo ya capturado, elección explícita, antelación, fuera de
jornada, respuesta del modelo con promesa falsa, edición sin enlace,
persistencia/duplicados, token revocado, reconexión, conflicto real de Google,
regresión con invitaciones y tenant ajeno. Navegador en Asia/Tokyo para verificar
que la reunión usa la zona empresarial America/Bogota.

Guarda evidencia en .artifacts/calendar-optional/. No depende de un proveedor
LLM externo, OAuth real, pagos ni mensajes a clientes.
