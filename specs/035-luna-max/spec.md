# 035 — GPT-6 Luna con razonamiento máximo

Solicitud del dueño (2026-10-26): cambiar el modelo que responde los mensajes
por la versión más reciente de Luna, a su máxima capacidad.

Objetivo: respuestas con gpt-6-luna y reasoning_effort=xhigh en OpenAI Chat
Completions, mediante el adaptador existente. Mantener contratos JSON,
reintentos, aislamiento, WhatsApp y agendamiento. El perfilado conserva
gpt-5.6-luna y su razonamiento por defecto (rol background). Sin cambiar prompts,
transcripción o configuración de empresas.

Aceptación: payload real con modelo y esfuerzo correctos; API de la cuenta
acepta el modelo; UI/canal responden; formato inesperado y proveedor caído
degradan y permiten recuperarse; gate completo y deploy saludable.

Fuente: https://developers.openai.com/api/docs/models/gpt-6-luna
La versión vigente es gpt-6-luna. La documentación enumera max, pero una
solicitud real de esta cuenta devuelve 400 unsupported_value y enumera xhigh
como máximo admitido. Se utiliza xhigh, sin cambiar endpoint. Chat Completions
admite el flujo actual de JSON en texto: no se usan herramientas/function calls
del proveedor ni parámetros de muestreo incompatibles.
