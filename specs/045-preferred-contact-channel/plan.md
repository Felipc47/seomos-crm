# Plan

1. Añadir columna tenant-scoped al perfil de agente, valor por defecto WhatsApp, API y selector UI.
2. Compartir la selección y el guard de saludo entre Meta y Sheets. Para SMS, renderizar la plantilla aprobada del servicio sin agregar texto de baja automáticamente y usar reserva durable y operación idempotente por contacto.
3. Distinguir mensajes automáticos en la bandeja SMS. Activar IA individual por defecto en nuevos contactos SMS consentidos; el agente maestro y las bajas siguen gobernando las respuestas.
4. E2E: dos fuentes con servicios/plantillas distintos, SMS único por fila, Meta directo, default WhatsApp, duplicados, fallos proveedor y tenant.
5. Gate técnico, publicación conjunta de 043–045 y configuración Lion Data en producción; comprobar salud, fuentes y estado externo de Brevo.
