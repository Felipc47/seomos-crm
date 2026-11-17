# Despliegue 046 — 2026-11-17

- App Coolify `ds8dao6gcn8qg4ro04upkgno`, dominio `https://seomos.cloud`, rama `codex/lead-sms-auto-enroll`.
- Código final `1bee8b23c185d3a5b598e6ee554d328cf1eba637`; despliegue `c6jnwtulxnizanyorz2dtxap` terminó `finished`. Imagen activa con ese SHA y contenedor saludable; `/api/health` público devolvió 200. Se confirmó la frase de correo ya conocido dentro del bundle activo.
- Migraciones 0043 y 0044 aplicadas: `sms_contact.handoff_at`, `sms_contact.handoff_reason`, `lead.follow_up_channel` presentes en producción.
- Lion Data conserva perfil de agendamiento bilingüe, Google Calendar conectado y SMS como canal predeterminado; las otras tres empresas conservan WhatsApp.
- En el hilo consentido mostrado por el dueño, la IA estaba apagada con una pregunta de horarios todavía como último SMS entrante. Tras el deploy 046, se reactivó solo ese contacto bajo condiciones de consentimiento activo, sin baja, sin bloqueo y sin respuesta manual posterior. El barrido normal de 03:00 UTC encoló el turno. El agente ofreció dos horarios de la agenda real y Brevo registró el SMS como `delivered`; la IA quedó activa. Esa respuesta salió antes del pulido de correo conocido, por lo que aún pidió confirmación del correo. No se mandó un SMS adicional por esa corrección de texto.
- Self-test local: 22 comprobaciones del agente SMS existente + 15 de la paridad con mocks, 630 unitarias, typecheck, lint y build. Incluye oferta de horarios, reserva confirmada, nota, etapa, seguimiento SMS y cancelación al recibir respuesta, asignación/notificación humana, estado visible, reactivación y salida inválida del proveedor.
- El envío de comercio que depende de una sesión WhatsApp se deriva a una persona cuando la conversación es SMS; no se simula un pedido por SMS.
