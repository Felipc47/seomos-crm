# Contrato de Mailing

Auth de organización existente. Admin/Marketing/Comercial pueden operar; solo Admin gestiona remitente. IDs ajenos: 404. Datos inválidos: 422; transición no permitida/DNS pendiente: 409; proveedor: 502 con mensaje sanitizado.

- GET /api/mailing: estado agregado de remitente (incluye canConfigureTracking), listas, suscriptores, programas, inscripciones e historial. Sin tokens de baja ni secretos.
- POST /api/mailing: discriminante action; create_list, add_subscribers (rows email/name/consent, listId), unsubscribe_subscriber, create_program (kind/name/listId/steps), update_program (solo draft), duplicate_program, start_program (scheduledAt opcional, autoEnroll para secuencia), pause_program, resume_program, cancel_program, enroll_program, stop_enrollment, test_program (destino email del usuario autenticado).
- POST /api/mailing/sender: action configure (domain/fromEmail/fromName/replyTo/trackOpens/trackClicks) o verify; solo Admin. Devuelve registros reales del proveedor. Sobre dominios preexistentes o usados por RESEND_FROM_EMAIL, conserva los ajustes de tracking y solo consulta el estado: no PATCH ni POST verify al proveedor. Las opciones de tracking se modifican únicamente en dominios creados exclusivamente por Mailing.
- GET /api/mailing/unsubscribe?token=…: página de confirmación sin mutar. POST mismo token: baja idempotente de esa empresa; admite List-Unsubscribe-Post.
- POST /api/mailing/webhook: headers svix-id/timestamp/signature, body crudo, firma/edad válidas. Tipo/email_id validado; org se deduce del envío local, con tags firmados para callbacks adelantados. Eventos transaccionales/pruebas ajenos al ledger se ignoran. Duplicado: 200 sin efectos nuevos.
- POST /api/cron/sweep: Bearer AGENT_SWEEP_SECRET; procesa mailing independientemente del navegador, con presupuesto y estado durable. now solo se acepta en mocks.
- POST /api/cron/mailing: mismo Bearer; procesa exclusivamente Mailing cada minuto, sin invocar WhatsApp/IA ni correo transaccional. Conserva lock e idempotencia; now solo en mocks. 404 sin autorización, 503 ante error inesperado con mensaje sanitizado.
- /api/dev/resend-mock/domains y /[id]/verify: solo mockGuard; configuración de estado/fallo vía mock de administración. Los IDs/records DNS del mock nunca se usan en producción.

## Habilitación exclusiva del superadmin

`PATCH /api/admin/companies/:id/mailing` body `{ "enabled": boolean }`, respuesta `{ "company": { "id": string, "mailingEnabled": boolean } }`. 401 sin sesión; 403 sin superadmin; 422 boolean inválido; 404 empresa inexistente/eliminada; 409 envío/DNS en curso (reintentar). GET empresas incluye mailingEnabled. Deshabilitada: Mailing GET/POST/sender devuelven404, página redirige inbox, nav oculta. Bajas y eventos firmados no se deshabilitan.

Envío inmediato: start_program sin scheduledAt, resume_program y enroll_program inician un barrido por empresa/programa mediante after() después de persistir y responder. add_subscribers inicia un barrido de la empresa para pasos día0 en altas automáticas. Una fecha futura no inicia envío anticipado. GET /api/mailing incluye acceptedAt y nextAttemptAt para explicar estados y reintentos. Correos de prueba mantienen envío directo al operador autenticado y no afirman entrega al buzón.
