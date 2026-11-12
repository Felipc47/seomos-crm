# 043 — Servicio y bienvenida para leads de Sheets

Solicitud: seleccionar un servicio existente por pestaña y ejecutar los avisos internos y la plantilla que ya usa Meta Lead Ads, sin duplicar envíos ni alterar integraciones.

- Servicio opcional, aislado por empresa; sin servicio conserva importación de contactos solamente.
- Solo filas nuevas tras activar el servicio generan trabajo persistente. Las filas ya registradas nunca se reactivan al cambiar configuración.
- Asignar servicio solo cuando el lead no lo tiene; conservar etapa, responsable, consentimiento y bajas. El responsable del servicio sigue asignándose al derivar a humano.
- Crear/reutilizar conversación y lead; aviso por correo usa la deduplicación existente lead/destinatario y configuración vigente.
- Plantilla del servicio, respaldo global como Meta, con variables y bandeja existentes.
- Antes del saludo automático, bloquear por contacto y consultar historial y registro de intentos compartido: Meta, Sheets y formularios web no pueden saludar dos veces. También detectar plantillas manuales o campañas previas/en curso. No bloquear futuros envíos manuales o seguimientos intencionales.
- Registrar el intento antes de contactar al proveedor. Resultado incierto conserva reserva: no repetir automáticamente un envío potencialmente aceptado.
- Fallos de correo/WhatsApp no deshacen contacto/lead ni bloquean otros registros; mostrar resumen de flujos pendientes, completados y con incidencias.
- Lion Data: vincular las dos fuentes a sus servicios ya asociados a formularios Meta. No enviar mensajes retroactivos ni crear leads sintéticos en producción.
