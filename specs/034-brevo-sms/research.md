# Brevo SMS hacia Estados Unidos — descubrimiento

Fecha: 2026-10-21 (America/Bogota).
Estado: registro preparado; cuenta, remitente y desarrollo todavía pendientes.

## Alcance confirmado por el dueño

- Integrar SMS con Brevo en el CRM, comenzando por crear la cuenta con
  `ceo@seomos.com`.
- Usar registro mediante Google con ese mismo correo.
- Cubrir avisos y campañas dirigidos a contactos con consentimiento.
- El remitente será **Lion Data**, confirmado por el dueño. No registrar SEOMOS
  como marca remitente ni asociar la conexión a otra empresa.
- El dueño confirmó expresamente crear la cuenta gratuita con Google usando
  `ceo@seomos.com` y aceptar los términos y la política de privacidad de Brevo.

## Estado verificado

- No se encontraron referencias a Brevo o SMS en `src/` ni `.env.example`.
- El repositorio contiene cambios anteriores extensos. Se preservan; esta fase
  solo añade documentación en esta carpeta.
- Mailing tiene dominio separado (`src/server/mailing/`) y usa Resend. La
  integración solicitada añade SMS; no autoriza sustituir el proveedor de email.
- La constitución vigente tiene una lista cerrada de proveedores. La solicitud
  explícita del dueño autoriza ampliar únicamente el canal SMS con Brevo; antes
  de implementar corresponde registrar esa excepción en los documentos del repo.
- El registro gratuito oficial está abierto y preparado con `ceo@seomos.com` en
  el perfil de Chrome cuya cuenta Google visible se verificó con ese correo.
- La ficha específica de Lion Data se verificó en la vista Empresas del CRM,
  sin leer conversaciones. El dominio del correo de administración coincide con
  `liondata.com.co`.
- El botón de registro Google no abrió la autorización: primero mostró un fallo
  de conexión de reCAPTCHA y después un error genérico de registro. Una recarga
  no resolvió el fallo. El usuario recibió el paso de acceso manual; no hay
  confirmación de que lo haya completado.
- No se ha confirmado creación de cuenta, activación de SMS, API key, registro de
  remitente, compra de créditos ni envío real.

## Registro para Estados Unidos

Brevo exige registrar el Sender ID para mensajes transaccionales y de marketing.
Para EE. UU. también se registra un número toll-free y se espera aprobación;
Brevo publica un plazo posible de 4–6 semanas.

El trámite solicita identidad legal, dirección y registro del negocio; web,
privacidad y términos; contacto empresarial; casos de uso, volumen mensual,
ejemplos y evidencia del mecanismo real de opt-in. La marca y las páginas deben
corresponder al cliente remitente. Preparar datos no equivale a obtener aprobación.

Fuente primaria, consultada 2026-10-21:
https://help.brevo.com/hc/en-us/articles/28255350696466-Register-a-Sender-ID-to-send-SMS-messages

## Contrato técnico revisado

- Envío: `POST https://api.brevo.com/v3/transactionalSMS/send`, encabezado
  `api-key`; destinatario internacional, remitente registrado y contenido.
- `type` distingue `transactional` y `marketing`. Brevo advierte que un código
  STOP en el contenido puede reclasificar el mensaje como marketing. Validar
  contenido, tipo efectivo y las instrucciones de baja según el caso aprobado.
- Respuesta de aceptación: HTTP 201 con `messageId`. No demuestra entrega.
- Eventos disponibles: accepted, delivered, replied, bounce, unsubscribe y
  rejected, entre otros. El campo `id` documentado es el identificador del
  webhook, no un identificador único de cada evento.
- Confirmar autenticación del webhook y semántica de idempotencia/reconciliación
  del envío antes de implementar reintentos. No asumir que una función de
  idempotencia de email está disponible en SMS.

Fuentes primarias:
https://developers.brevo.com/reference/send-async-transactional-sms
https://developers.brevo.com/docs/transactional-sms-endpoints
https://developers.brevo.com/docs/transactional-webhooks

## Condiciones que afectan al diseño

- Validar país US, no solo prefijo +1 (compartido con otros territorios).
- Consentimiento y bajas SMS independientes de email y WhatsApp.
- Marketing requiere marca, baja y revisión de la ventana horaria aplicable al
  destinatario. No usar la hora de Colombia como hora de todos los receptores.
- Mostrar estimación de segmentos antes de confirmar: la codificación cambia
  el límite de caracteres. No presentar una tarifa sin cotización vigente.
- No usar acortadores públicos de enlaces para campañas de EE. UU.
- No activar envíos reales hasta disponer de remitente aprobado, saldo y
  autorización del envío y su costo.

Fuente primaria:
https://help.brevo.com/hc/en-us/articles/11884482521234-Country-specific-guidelines-and-restrictions-for-SMS-messages

## Pendientes que condicionan el siguiente paso

1. Completar el acceso Google/Brevo: hay autorización del dueño, pero el registro
   sigue fallando antes de abrir Google.
2. Sitio identificado y verificado públicamente:
   https://www.liondata.com.co/. La portada y `/contactus/` revisadas no muestran
   una casilla de consentimiento SMS ni enlaces a términos/privacidad. Esto no
   demuestra que no existan otras páginas; el formulario observado no aporta la
   evidencia de opt-in que necesitamos.
3. Confirmar razón social y datos exactos del registro de Lion Data,
   evidencia real del consentimiento, volumen y mensajes representativos.
4. La aprobación del operador/Brevo no se puede sustituir con mocks del CRM.

No se almacenan contraseñas, tokens o claves en estos documentos.
