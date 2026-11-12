# Plan

Extensión aditiva de 042. Runtime usa únicamente adaptadores ya autorizados. Sin credenciales nuevas.

1. Fuente con serviceId nullable validado por tenant; fila con servicio capturado y estado persistente none/pending/done/failed. Migración inicializa historial en none.
2. Cola se drena bajo lease de fuente, incluso después de error de lectura, con presupuesto de tiempo. La misma importación transaccional guarda fila y trabajo. Cambiar servicio cancela únicamente trabajo pendiente anterior.
3. Registro template_dispatch de intentos: todos los envíos conservan comportamiento; solo los saludos automáticos consultan historial/registro y se reservan bajo bloqueo del contacto. Guard adicional de baja, bloqueo y archivo.
4. Reusar notificación email y conversación; servicio antes de correo. Resultado de un canal independiente del otro. No sustituir servicio manual existente.
5. UI en integraciones con selector por fuente y resultados; controles anteriores conservados.
6. Gate técnico y E2E mocks: selector, correo/plantilla correctos, reejecución, Meta↔Sheets, intentos inciertos, bajas, tenant, historial sin retroactividad; regresión 042.
7. Merge/deploy SHA probado, migración, configuración Lion Data, ciclos naturales y verificación de no envíos retroactivos e integraciones existentes.

Riesgo: no hay transacción distribuida con Meta. Reserva durable garantiza a lo sumo un intento automático, pudiendo requerir revisión manual tras un fallo incierto. No promete entrega exactamente una vez.
