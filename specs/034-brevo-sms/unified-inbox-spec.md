# Bandeja unificada de WhatsApp y SMS

Solicitud del dueño: 2026-11-16. Las conversaciones SMS deben aparecer en la Bandeja general, junto a WhatsApp, con una pill de canal claramente visible y un filtro Todos / WhatsApp / SMS.

## Criterios de aceptación

- La lista mezcla conversaciones de ambos canales por actividad reciente; conserva los anclados de WhatsApp. Cada fila y encabezado del hilo muestra su canal con texto, icono y color. Búsqueda incluye SMS por nombre, teléfono y último mensaje.
- Seleccionar un SMS abre su historial y composer dentro de Bandeja. Alta de contacto SMS con evidencia de consentimiento, revisión previa, envío, estados, baja y respuestas siguen usando los endpoints y guardas SMS existentes. No se confunden los contactos ni permisos de WhatsApp con SMS.
- La vista SMS separada deja de estar en la navegación. `/sms` redirige a `/inbox?channel=sms` para preservar enlaces existentes.
- Roles sin permiso de SMS solo ven WhatsApp. No hay fuga entre empresas; saldo desconocido/cero o baja mantiene bloqueado el composer. La actualización periódica muestra respuestas sin recargar.
- En móvil, lista e hilo mantienen el patrón de la Bandeja y no generan desbordamiento horizontal.

## Fuera de alcance

- Unificar contactos de los dos canales en la base de datos, IA para SMS, campañas SMS o cambios en el proveedor Brevo.
