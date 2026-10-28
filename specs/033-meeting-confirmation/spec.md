# 033 — Reunión del prospecto y confirmación previa

Solicitud: guardar enlace, fecha y hora en una sección especial del prospecto y confirmar automáticamente con el lead 45 minutos antes.

## Comportamiento
- Detalles → Reunión muestra fecha/hora en la zona de la empresa, enlace clicable, origen y estado de la confirmación.
- Agendar desde el CRM (operador o IA) actualiza la sección automáticamente. También se permite registrar una reunión externa, corregir el registro y quitar su confirmación. Quitar el registro NO cancela el evento en Google.
- La confirmación automática por WhatsApp está activada por defecto. Pregunta si asistirá e incluye fecha/hora y enlace. No requiere LLM ni créditos y funciona con IA apagada o conversación derivada.
- Se programa para inicio menos 45 minutos. Si se registra dentro de esos 45 minutos se envía en el siguiente barrido antes del inicio. Reuniones vencidas no envían mensajes.
- Agente → Agendamiento permite preparar una plantilla de confirmación con los parámetros adecuados, sin usar el mapeo de datos del contacto del editor general. No duplica una plantilla existente. Su uso espera aprobación real de Meta.
- Ventana de 24h abierta: texto libre. Cerrada: plantilla UTILITY aprobada configurada por empresa, sin encabezado ni mapeo y con una variable {{1}} que contiene los datos de la reunión. Sin plantilla válida queda omitida con motivo visible; nunca se evita la regla de Meta.
- Se respeta baja, bloqueo, archivo y sandbox. No se envían recordatorios duplicados por barridos concurrentes, reinicios o guardados sin cambio de reunión. Un resultado incierto del proveedor no se reenvía automáticamente.
- Reprogramar reinicia el recordatorio; desactivar lo cancela. Mientras se procesa un envío no se puede cambiar el registro. La respuesta del lead permanece en el chat: no se marca asistencia confirmada por el simple envío.

## Supuestos y límites
- Canal elegido: WhatsApp, canal de la relación con el prospecto.
- Una próxima reunión por prospecto. La edición de un registro de Google modifica el CRM; no reprograma ni cancela Google. La UI lo indica.
- Cron dedicado de reuniones cada minuto; el barrido general existente (documentado cada cinco minutos) conserva la recuperación: envío nominal 45 minutos antes, con precisión de un barrido.
- Los registros anteriores se recuperan con su fecha y sin automatización activa hasta revisar el enlace. No se interpretan notas libres como una confirmación fiable.
- Alcance de implementación y prueba: entorno local aislado con mocks. Publicación es una fase posterior.

## Aceptación
1. Google manual/IA persiste registro estructurado y visible.
2. Registro externo y corrección/cancelación ejercidos desde la UI, incluido móvil.
3. Antes del umbral: cero mensajes; al umbral: un mensaje observable en el chat y outbox; barrido repetido/concurrente: cero duplicados.
4. Reprogramación elimina la fecha previa; reunión vencida/inhabilitada no envía.
5. Ventana cerrada con/sin plantilla; baja/bloqueo/sandbox; proveedor fallido/resultado incierto degradan con estado visible.
6. Empresa ajena no lee, edita ni cancela reuniones de otra empresa.
