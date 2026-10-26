# Lion Data — preparación de SMS USA

Fecha de revisión: 2026-10-21, America/Bogota.
Estado: borrador para revisión; no publicado ni presentado a Brevo.

## Datos identificados

- Marca remitente confirmada por el dueño: Lion Data.
- Correo de la cuenta Brevo autorizado: `ceo@seomos.com`, registro con Google.
- Web pública verificada: https://www.liondata.com.co/.
- Página de contacto revisada: https://www.liondata.com.co/contactus/.
- Email de contacto publicado en el sitio: `info@liondata.com.co`.
- La empresa Lion Data existe en la vista Empresas del CRM.

El nombre comercial no sustituye la razón social. La dirección, identificación
del negocio y persona responsable deben confirmarse con Lion Data antes de
registrar el remitente; no completar esos campos por inferencia.

## Hallazgo del formulario

El formulario observado solicita nombre/empresa, email, teléfono, tema y mensaje.
No muestra una casilla para consentir SMS ni enlaces de términos y privacidad.
Recibir una solicitud de contacto no acredita consentimiento para campañas SMS.

Antes de presentar evidencia de opt-in: definir el mecanismo real, adaptar el
formulario si corresponde, publicar políticas adecuadas y conservar el texto,
fecha, finalidad y fuente del consentimiento. No marcar contactos actuales como
suscritos automáticamente.

## Borrador de consentimiento en inglés

Propuesta para dos casillas opcionales, sin premarcar. No aplicar al sitio hasta
revisar con el responsable de Lion Data el uso real y las URLs legales.

Avisos:

> I agree to receive text messages from Lion Data about my consultation requests,
> appointments, and service updates at the number provided. Message frequency
> varies. Message and data rates may apply. Reply STOP to opt out or HELP for help.

Marketing:

> I agree to receive marketing text messages from Lion Data at the number
> provided. Consent is not a condition of purchase. Message frequency varies.
> Message and data rates may apply. Reply STOP to opt out or HELP for help.

Acompañar las casillas con enlaces a la política de privacidad y términos SMS
reales de Lion Data. Esas URLs aún no están verificadas. El CRM debe conservar
consentimiento separado por finalidad y respetar la baja SMS inmediatamente.

## Ejemplos para revisión del registro

Aviso:

> Lion Data: We received your consultation request. Our team will contact you
> shortly. Reply HELP for help or STOP to opt out.

Marketing:

> Lion Data: Need to connect your ecommerce and business systems? Explore our
> services at https://www.liondata.com.co/. Reply STOP to opt out or HELP for help.

Son ejemplos; no se enviaron. El aviso solo corresponde a una solicitud real del
destinatario. Revisar con Brevo la clasificación efectiva si el contenido incluye
STOP, porque su documentación advierte reclasificación automática a marketing.

## Datos pendientes para el trámite

- Razón social, país y estructura legal del negocio.
- Identificador oficial y dirección exactos.
- Responsable del trámite y contacto empresarial autorizado.
- Volumen SMS mensual previsto.
- Finalidades concretas y fuente de los contactos con consentimiento.
- URLs legales publicadas y prueba del opt-in real.
- Presupuesto de créditos y destinatario autorizado para la prueba posterior.

## Fuentes primarias

- Sitio y formulario revisados en navegador:
  https://www.liondata.com.co/
  https://www.liondata.com.co/contactus/
- Requisitos del registro:
  https://help.brevo.com/hc/en-us/articles/28255350696466-Register-a-Sender-ID-to-send-SMS-messages
- Contrato de envío y clasificación del contenido:
  https://developers.brevo.com/reference/send-async-transactional-sms

No se han modificado el sitio de Lion Data ni la configuración productiva del CRM.
