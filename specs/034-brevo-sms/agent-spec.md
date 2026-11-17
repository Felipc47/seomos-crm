# Agente automático en conversaciones SMS

Decisión del dueño, 2026-11-16: el agente debe responder automáticamente en SMS, como en WhatsApp. El canal conserva su consentimiento y saldo propios.

## Aceptación
- Cada contacto SMS tiene un interruptor de IA en Bandeja. La migración lo deja apagado para todos los contactos existentes; el operador puede activarlo explícitamente. El perfil global del agente debe estar activo.
- Una respuesta entrante nueva y autenticada de Brevo activa un turno del mismo perfil e instrucciones del negocio. STOP/baja, falta de consentimiento, servicio pausado, saldo SMS/IA insuficiente, perfil apagado o interruptor apagado nunca envían.
- El modelo responde con texto breve, máximo un segmento SMS. Solicitudes de humano pausan la IA. Formato inválido, timeout o error del proveedor no envía y deja la conversación para atención humana.
- La reserva de crédito IA y el envío SMS son idempotentes. Repetir el webhook o reiniciar el proceso no duplica respuesta; un resultado incierto de Brevo nunca se reintenta a ciegas. Un envío manual o una baja mientras el modelo piensa cancelan la respuesta automática.
- Los mensajes automáticos se distinguen visualmente. No se llama la API real ni se consumen créditos en pruebas.
