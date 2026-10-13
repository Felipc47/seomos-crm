# Chat demo del agente

En Agente de IA → Comportamiento, un administrador/editor puede abrir Chat demo para conversar con el mismo proveedor y prompt del agente, usando los cambios actuales del formulario (sin guardar) y el conocimiento guardado de su empresa. Funciona sin WhatsApp configurado y con agente apagado. Mantiene el historial durante la sesión, permite reiniciar y muestra respuestas en el idioma elegido. Al recargar/cerrar, el historial temporal desaparece.

No crea contactos, conversaciones, leads, seguimientos, reuniones ni envíos. Las acciones del agente se muestran como simuladas; handoff termina esa sesión hasta reiniciarla. No invoca Graph ni Google Calendar. Preserva el sender sandbox y la ausencia de /api/lab/*. Se prueba la conversación configurada, sin certificar disponibilidad real del calendario.

Como el asistente de configuración existente, no descuenta la billetera de intervenciones del CRM; usa el proveedor configurado y límites antiabuso (12 turnos/sesión, 20 solicitudes/minuto/usuario, inputs acotados). No introduce credenciales, tablas ni dependencias. Esta decisión facilita configurar agentes de clientes todavía sin número activo.

API privada por empresa/rol; no acepta organizationId ni mensajes system desde el cliente. El error del proveedor conserva el texto y permite reintentar sin quedar cargando. Aceptación: navegador feliz/infeliz, historial, tres idiomas, borrador sin persistencia, conocimientos aislados, reset/handoff, cero efectos reales y móvil. Publicar tras gate completo y self-test.
