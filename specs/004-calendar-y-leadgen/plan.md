# Corrección: agendar sin Google Calendar (2026-10-26)

1. Separar la capacidad de agendar del estado de Google en el prompt/pipeline.
   Las pruebas históricas siguen excluidas. Aplicar las reglas existentes en
   ambos modos y distinguir jornada propuesta de disponibilidad externa.
2. Reutilizar meeting/saveMeeting para guardar en el CRM con origen manual
   cuando no hay Google válido. No introducir tablas, proveedores ni secretos.
   Una conexión revocada degrada a CRM; conflictos de Google siguen negociando.
3. Confirmar según resultado persistido; ninguna respuesta del modelo puede
   prometer invitaciones/Meet en una reserva local. Permitir editar reuniones
   sin enlace, conservando validación HTTPS cuando se proporciona. Actualizar UI y ayuda.
4. Verificar prompt, servicio, flujo UI + WhatsApp con mocks, reconexión,
   validación/confirmación de horario, no duplicados y aislamiento. Ejecutar
   typecheck, lint, build y suite unit. Usar BD local nueva y puerto dedicado.

Constitución: queries scoped, sin nuevas credenciales o migraciones, integración
Google existente opcional y guardrails de is_test preservados. No incluye
sincronización retroactiva de reservas locales al reconectar Google.
