# 046 — Agente SMS con capacidades de conversación

Fecha: 2026-11-16. El dueño pide que las conversaciones SMS de Lion Data ofrezcan horarios y deriven a una persona como lo hace WhatsApp, además de conservar las capacidades comerciales del agente.

## Resultado esperado

- El agente SMS utiliza misión, idioma, reglas de escalado, conocimiento, servicio y política de agendamiento configurados para la misma empresa.
- Ante una solicitud de llamada/cita, ofrece horarios concretos de la agenda configurada. Si Google Calendar está conectado, consulta disponibilidad real. Si no lo está, identifica los horarios como propuestas basadas en la jornada, sin afirmar disponibilidad externa.
- Cuando la ficha ya tiene correo, la oferta de horarios no vuelve a pedirlo; si falta, solicita el correo antes de registrar la reunión.
- Solo registra una reunión después de comprobar correo, fecha válida y confirmación del cliente en el turno actual; usa el mismo repositorio de reuniones del CRM. Una falla de agenda deriva a una persona.
- La derivación SMS queda visible en Bandeja, apaga la IA del hilo, asigna el lead al responsable del servicio y notifica al usuario correspondiente. Reanudar IA despeja la derivación sin responder mensajes antiguos.
- El agente SMS puede actualizar nota, etapa y seguimiento del lead usando las mismas validaciones del agente WhatsApp; una acción no disponible para SMS se degrada sin inventar operaciones.
- Salidas inválidas del proveedor se reintentan y se derivan con un motivo visible si persisten. STOP continúa bloqueando envíos. Un mensaje manual que llega mientras razona la IA gana la carrera.
- Si el prospecto pide seguimiento posterior, el barrido usa SMS, conserva el idioma de la conversación y cancela la rutina cuando llega una nueva respuesta. Un fallo de envío deriva a una persona sin cerrar el lead como «No convertido» por ausencia de respuesta a un SMS fallido.
- Las respuestas se mantienen concisas para SMS; no se añade automáticamente ninguna frase de baja a las plantillas.

## Alcance

Aplica a SMS consentidos y a cada empresa de forma aislada. No envía mensajes reales durante el self-test; se usan mocks. El canal favorito solo determina el saludo inicial, no impide que el cliente continúe por SMS o WhatsApp. Las acciones de comercio que requieren una sesión WhatsApp se derivan a una persona desde SMS.
