# Contactos compartidos en WhatsApp

Solicitud: ver los contactos adjuntos en la bandeja y publicar directamente.

- Cada mensaje contacts muestra todas las fichas: nombre, teléfonos, correos,
  empresa, dirección, web y cumpleaños cuando estén presentes.
- Los datos persisten al recargar y llegan en tiempo real usando el DTO existente.
- Enlaces seguros permiten llamar/escribir; no se crean prospectos automáticamente.
- Webhooks repetidos no duplican mensajes. Datos inválidos no bloquean el hilo.
- Históricos sin datos explican que se debe compartir de nuevo: la ingesta
  anterior descartaba messages[].contacts y no retenía el payload crudo.
- Se conservan autenticación, aislamiento por empresa y guardas de prueba.
