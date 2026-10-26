# Verificación local y disponibilidad de la cuenta

2026-10-26: proveedor real https://api.openai.com, modelo anterior gpt-5.6-luna.
Sin credenciales nuevas; se reutiliza la credencial del contenedor, sin leerla
ni mostrarla.

- GET /v1/models/gpt-6-luna: 200, ID gpt-6-luna.
- Chat Completions con max: 400 unsupported_value; la respuesta enumera
  none, low, medium, high y xhigh. No se activa max.
- Misma solicitud sintética con xhigh: 200; modelo gpt-6-luna, 4144 ms,
  72 reasoning tokens y JSON action=reply con oferta de agendamiento.
  No se envía información de clientes ni mensajes a WhatsApp.
- Gate: typecheck, lint y build verdes; 458 tests unitarios (57 archivos).
- Playwright/Chrome + WA/IA mocks: 11 comprobaciones aprobadas, incluyendo
  respuesta real en la UI de Bandeja y demo, perfilado anterior, reintentos,
  JSON inesperado, fallo de proveedor y recuperación.

Configuración a publicar: gpt-6-luna / xhigh; perfilado gpt-5.6-luna sin
esfuerzo explícito. La documentación oficial enumera max, pero se prioriza
la compatibilidad observada de la API de esta cuenta. No se cambia de endpoint
ni se envían function calls al proveedor; las acciones son JSON validado.

Evidencia: .artifacts/luna-max/{build.log,unit.log,e2e.json,inbox.png,demo.png}.
Captura del probe real: workspace original .artifacts/luna-max/provider-probe.jpg.
Publicación pendiente de verificar.
