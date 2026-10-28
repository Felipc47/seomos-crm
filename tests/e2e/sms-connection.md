# Brevo SMS: conexión (primera parte de 034)

Base local 3110 y BD aislada seomos_sms_034. Claves y cuentas ficticias. Ejecutar
migraciones, sms-connection-start.mjs y sms-connection.mjs. El self-test conduce
registro/login y Ajustes > SMS, verifica persistencia cifrada, actualización,
reemplazo fallido, saldo cero/desconocido, permisos/tenant y desconexión. Comprueba
que el endpoint de envío se bloquea sin conexión ni remitente. No gasta créditos ni crea registros en Brevo.

Producción: dev/brevo-mock 404 aun con WA_MOCK_ENABLED, isMockEnabled manda.
Los envíos individuales, campañas y aprobación de remitente se prueban en la
siguiente parte; la conexión no debe reportarse como integración SMS activa.
