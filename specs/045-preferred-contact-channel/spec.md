# 045 — Canal favorito de contacto por empresa

Fecha: 2026-11-16. El dueño elige SMS para Lion Data (LD) y WhatsApp para SEOMOS y las demás empresas. Confirma que la bienvenida de SMS use el texto de la plantilla de WhatsApp vinculada al servicio de origen y que salga solo por SMS cuando este sea el canal favorito.

## Aceptación
- Agente permite elegir WhatsApp o SMS por empresa, con WhatsApp como valor inicial para todas las organizaciones existentes y nuevas.
- La preferencia determina el canal de bienvenida de los nuevos leads Meta y Sheets. Las respuestas siguen en el canal por el que el contacto escribe. Cada lead SMS nuevo y consentido tiene la IA individual activada por defecto; el interruptor maestro del agente sigue gobernando las respuestas y las pausas existentes se conservan.
- Cada pestaña Sheets conserva su servicio. Su plantilla aprobada se personaliza con el contacto/servicio y se envía como SMS si la empresa eligió SMS; no se envía también WhatsApp.
- El SMS identifica la marca e incluye STOP si la plantilla no lo trae. Se muestra como bienvenida automática y aceptación del proveedor se distingue de entrega.
- Sin consentimiento SMS, número US válido, remitente aprobado, webhook o saldo, no se intenta WhatsApp como canal alterno. El contacto y el fallo quedan visibles para revisión, sin envío duplicado.
- Meta y Sheets comparten la reserva de saludo, y los ciclos repetidos no duplican SMS ni WhatsApp.
- Activar la preferencia no envía mensajes retroactivos ni cambia la IA de contactos existentes. Cambios de empresa no alteran la preferencia de otras empresas.

## Estado externo
El remitente US de Brevo observado el 11 de noviembre estaba en Draft, sin aprobación ni saldo confirmado. La automatización de envíos reales depende de esos requisitos externos; se prueba con mocks sin gastar créditos.
