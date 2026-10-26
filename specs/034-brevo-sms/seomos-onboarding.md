# SEOMOS LLC — preparación de Brevo SMS

Estado 2026-10-26: borrador. No hay solicitud enviada ni remitente aprobado.
El dueño confirmó SEOMOS LLC como remitente actual, reemplazando Lion Data.

## Datos verificados

- Razón social: SEOMOS LLC. Tipo: Limited Liability Company privada, con fines de lucro.
- País y estado: Estados Unidos, Wyoming.
- Dirección del documento de constitución y de correspondencia pública:
  30 N Gould St Ste R, Sheridan, WY 82801.
- Articles of Organization: archivo local del mismo nombre en Descargas,
  presentado el 10 de abril de 2026. Se revisó la primera página completa.
- Carta EIN del IRS localizada en correo ceo@seomos.com, mensaje de Openbiz
  titulado «Recibimos la Carta EIN de su empresa», del 30 de abril de 2026.
  Aviso CP575G fechado 27 de abril. El EIN NO se copia a specs, logs, memoria o PR.
  Su entrada en Brevo está pendiente de autorización específica del titular.
- Sitio: https://www.seomos.com/ y privacidad:
  https://www.seomos.com/politica-de-privacidad/.
- El registro de Wyoming no es el EIN. Brevo para empresa US solo ofrece EIN.
- El correo y teléfono del contacto de Brevo siguen siendo los del titular;
  no se usan los del agente registral que aparecen en Articles.

## Pendientes reales

1. Generar clave API restringida, tras confirmación por crear acceso persistente.
   Preparada: SEOMOS CRM — cuenta SMS, solo Account Read, vencimiento 26/10/2027
   o 90 días sin uso. La primera parte del CRM solo consulta cuenta/saldo.
2. Consentimiento SMS específico verificable. El formulario actual del sitio
   autoriza WhatsApp; no constituye autorización SMS. No importar leads actuales.
3. Términos SMS públicos y ajuste de privacidad conforme a las exigencias de Brevo.
4. Volumen mensual y casos concretos de avisos y marketing, sin declarar datos inventados.
5. Presentación de solicitud completa, confirmación legal del titular y aprobación
   por Brevo/operadores; no es instantánea ni se promete plazo.
6. Avisos/campañas en el CRM con consentimiento, STOP/HELP, outbox y eventos;
   la primera parte de conexión no implementa estos envíos.
7. Créditos y prueba real: destinatario y costo autorizados antes de usar saldo.

## Propuesta de copy, no publicada

Los siguientes textos son borradores de producto. Solo publicar al tener el
mecanismo efectivo de altas, bajas y ayuda, los enlaces finales y la aprobación
correspondiente. No se presentan como un flujo ya operando ante Brevo.

Consentimiento opcional, casilla sin seleccionar y separada de WhatsApp:

> Quiero recibir de SEOMOS LLC mensajes de texto sobre mi solicitud y los
> servicios que contrate. La frecuencia depende de mi actividad. Pueden aplicar
> tarifas de mensajes y datos. Responde STOP para darte de baja y HELP para ayuda.
> Contacto: info@seomos.com. Mi autorización no es una condición de compra.

Marketing requiere una segunda autorización opcional, sin seleccionar:

> Quiero recibir por SMS novedades y ofertas de SEOMOS LLC. La frecuencia es
> variable. Pueden aplicar tarifas de mensajes y datos. Responde STOP para
> cancelar o HELP para ayuda. No es una condición de compra.

Ambas casillas deben enlazar privacidad y términos SMS públicos. Guardar texto y
versión aceptados, finalidad, teléfono US validado, fecha, fuente y evidencia.
No deducir permiso de un teléfono, una casilla de email o una autorización WhatsApp.

Propuesta de términos SMS:

> SEOMOS LLC envía avisos relacionados con solicitudes y servicios y, únicamente
> con autorización independiente, novedades u ofertas por SMS. Podemos usar
> sistemas automatizados. La cantidad de mensajes depende del servicio y de tu
> actividad. Tu operador puede cobrar mensajes y datos. Puedes cancelar los SMS
> respondiendo STOP y pedir ayuda con HELP o por info@seomos.com. Darte de baja
> de SMS no cancela tus servicios contratados. La autorización de marketing no
> condiciona una compra. Los operadores no responden por retrasos o mensajes
> no entregados. Consulta nuestra política de privacidad para el uso de datos.

Brevo exige este texto literal en privacidad (21 palabras, observado en su UI):

> All the above categories exclude text messaging originator opt-in data and
> consent; this information won’t be shared with any third parties.

Debe quedar coherente con la descripción de encargados, su entrega operativa y
la prohibición de compartir consentimiento SMS para el marketing de terceros.
No afirmar que las políticas actuales ya incluyen esta cláusula.

## Fuentes actuales

- https://www.seomos.com/nosotros/ — identidad comercial US/CO.
- https://www.seomos.com/ — consentimiento del formulario menciona WhatsApp.
- https://www.seomos.com/politica-de-privacidad/ — dirección y fines actuales.
- https://help.brevo.com/hc/en-us/articles/28255350696466-Register-a-Sender-ID-to-send-SMS-messages
- UI autenticada de Brevo: Request a toll-free number, Company information,
  Website and terms, Type of SMS messages and proof of opt-in.
