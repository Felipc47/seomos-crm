# 036 — Misión y ritmo comercial del agente

Solicitud del dueño (2026-10-26): definir la misión principal del bot y activar
opcionalmente un número mínimo de mensajes antes de proponer agendamiento.

- Misión por empresa: entrenamiento actual (compatibilidad), agendar, vender,
  vender con ecommerce, calificar, soporte, informar o personalizada; detalles
  opcionales. Ecommerce utiliza el enlace de tienda y conocimiento cargado.
  La conexión real de catálogo/pedidos está pendiente de definición con el dueño.
- Espera opcional, inicialmente apagada; umbral de 1 a 50, inicialmente 3.
  Cuenta respuestas del bot aceptadas por el canal y no fallidas, de toda la
  conversación. Excluye mensajes humanos, entrantes, plantillas y pendientes
  sin evidencia de envío. N mensajes deben existir antes de la propuesta:
  con N=3, las primeras 3 respuestas no proponen; la cuarta puede proponer.
- El umbral limita ofertas proactivas. Una solicitud explícita del cliente
  permite atender el agendamiento antes, conservando validación de fecha/hora,
  confirmación, correo y reglas de agenda. No fuerza ofrecer al llegar al mínimo.
- El servidor controla schedule_meeting y filtra propuestas prematuras, aunque
  el LLM ignore el prompt. La misión guía respuesta y seguimiento sin inventar
  integraciones, stock, pagos, pedidos o citas. Google sigue siendo opcional.
- Misma configuración y política en demo, incluidos cambios sin guardar.
- Aislamiento por empresa y permisos actuales; defaults preservan clientes.

Aceptación: guardar/recargar, activar/desactivar, límite exacto, historial >20,
solicitud explícita, mensajes humanos/fallidos, demo, ecommerce sin promesas de
conexión, errores del proveedor, tenant ajeno y gate técnico completos.
