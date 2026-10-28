# Plan preliminar — SMS Brevo

Estado: remitente SEOMOS LLC confirmado; teléfono verificado. Registro legal y
aprobación externa pendientes. Primera parte: conexión cifrada sin envíos.

## Fronteras propuestas

- `src/lib/brevo/`: adaptador HTTP tipado; timeout, errores sanitizados y validación
  de respuestas. Sin SDK ni servicios adicionales necesarios.
- `src/server/sms/`: conexión cifrada por empresa, consentimiento, outbox,
  procesamiento de campañas, eventos y reconciliación.
- `src/app/api/sms/`: endpoints autenticados con permisos y validación Zod.
- `src/components/sms/`: conexión, avisos, campañas y estado observables.
- Esquema y migración nuevos: todas las entidades de dominio con
  `organization_id` y consultas con `scoped()`.

Estos paths son propuestas; no se han creado módulos de aplicación.

## Principios que debe preservar la implementación

1. Actualizar la constitución y guías para reconocer la autorización explícita
   de Brevo opcional para SMS; mantener Resend para email.
2. Credenciales cifradas con el mecanismo existente y nunca devueltas al cliente.
3. Consentimiento/bajas independientes de WhatsApp y Mailing.
4. Outbox persistente, reserva atómica y deduplicación de solicitudes/eventos.
5. Sin reintento ciego cuando el proveedor puede haber aceptado un envío.
6. Webhooks autenticados, acotados a la empresa y con estados monotónicos.
7. Configuración de mocks local sin posibilidad de alcanzar Brevo real.
8. No desplegar los cambios previos ajenos del worktree como parte de SMS.

## Secuencia

1. Resolver el fallo de registro Google/Brevo con la cuenta correcta. La
   autorización del dueño para aceptar términos ya fue recibida.
2. Preparar registro del remitente Lion Data con datos legales y evidencia real.
3. Cerrar spec, modelo, contratos y diseño de reconciliación/idempotencia.
4. Implementar conexión y envío individual; después campañas y eventos.
5. Typecheck, lint, build, tests unitarios y E2E con mocks, incluidos fallos.
6. Configurar conexión real de la empresa y webhook tras la aprobación necesaria.
7. Verificar envío real únicamente con destinatario y costo autorizados; observar
   su entrega o fallo y reportar el estado efectivo.

## Decisiones que faltan

- Casos concretos de Lion Data que disparan avisos.
- Fuente real del consentimiento y volumen aproximado.
- Contrato verificado de autenticación de callbacks y reconciliación de Brevo.
- Presupuesto de créditos y destinatario para la prueba real, antes de gastarlos.

## Contrato de conexión (2026-10-26)

- `/api/settings/sms`: GET solo proyección pública de conexión; PUT valida
  `/v3/account` antes de guardar; DELETE elimina conexión de la empresa actual.
- `/api/settings/sms/test`: POST de comprobación por lectura, sin envíos.
- Clave por organización con AES-256-GCM. Errores tipados sin body del proveedor.
- Saldo desconocido se conserva como desconocido, nunca como cero inventado.
- El mock interno intercepta todo acceso Brevo cuando está activo; en producción
  solo se permite HTTPS a api.brevo.com, sin redirects ni base URL configurable.
- No hay endpoint de envío en esta parte: los permisos futuros de SMS y la
  aprobación del remitente se validarán antes de habilitar avisos/campañas.
- Verificación: UI local con mocks, fallos de auth/formato/disponibilidad,
  aislamiento tenant y rol; gate completo y migración reejecutable.
