# Brevo SMS — envío y respuestas desde el CRM

Solicitud del dueño, 2026-10-28: integrar Brevo para enviar y recibir mensajes desde
la herramienta usando su cuenta corporativa abierta en Chrome. Canal confirmado
por el contexto y las pestañas abiertas: SMS; remitente SEOMOS LLC.

## Comportamiento requerido

- Sección SMS con contactos propios por empresa, historial entrante/saliente y
  redacción manual. El usuario revisa destinatario, contenido y segmentos antes
  de confirmar el envío. Sin campañas ni respuestas IA automáticas en esta fase.
- Alta con número US válido y evidencia de consentimiento SMS independiente.
  Baja manual o STOP/unsubscribe bloquea futuros envíos. No importar contactos
  WhatsApp ni interpretar una respuesta normal como consentimiento.
- Administrador conecta la API cifrada y configura un número US aprobado por
  Brevo y una referencia a la aprobación. Credencial y secreto del webhook nunca
  regresan al navegador. El saldo cero/desconocido bloquea el envío.
- Webhook por empresa con autenticación Bearer en header, tamaño limitado,
  idempotencia y estados monotónicos. El evento `replied` se muestra como mensaje
  recibido ligado al destinatario original. Eventos desconocidos se ignoran.
- Reserva persistente e idempotencia por operación antes de contactar Brevo. Un
  timeout/respuesta inesperada deja resultado incierto y nunca reenvía a ciegas.
- Aceptado y entregado se distinguen. Se preservan eventos tempranos para poder
  aplicarlos cuando se guarda la respuesta del proveedor.
- Fallos del proveedor no afectan WhatsApp, Calendar, Mailing ni las otras empresas.

## Dependencias externas y límites de verificación

La documentación oficial describe webhooks SMS `replied`; la recepción real
requiere que Brevo habilite el número y entregue ese evento para esta cuenta.
No presentar una simulación como recepción real ni asumir que un borrador de
remitente está aprobado. No comprar saldo ni enviar a contactos reales sin un
receptor y costo autorizados. La nueva solicitud autoriza implementar Brevo;
la creación de credenciales persistentes por navegador requiere confirmación
justo antes de generarlas según la política de Computer Use.

## Aceptación

E2E desde interfaz: conectar mock, configurar remitente, crear contacto con
consentimiento, revisar/enviar, observar aceptado→entregado→respuesta y responder.
Casos infelices: sin sesión/permisos/consentimiento/saldo, tenant ajeno,
doble confirmación, webhook no autenticado/repetido/fuera de orden/temprano,
STOP, timeout y JSON inesperado. Ninguna prueba usa créditos reales.
