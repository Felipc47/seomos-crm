# Verificación

2026-11-12. Checkout aislado, sin datos de clientes en pruebas.

- E2E Playwright 043: 33 comprobaciones aprobadas. Flujo UI → Sheets → contacto/lead/conversación → correo interno y plantilla del servicio → respuesta → responsable. Llegadas Meta/Sheets y dos fuentes concurrentes producen un saludo y un aviso por destinatario. Repetición, reserva previa y resultado incierto no provocan otro intento automático.
- Historial previo, cambios de servicio y activación posterior no generan comunicación retroactiva.
- Fallos de correo/WhatsApp y Sheets se degradan conservando contacto y resultados observables; baja, archivo y bloqueo impiden saludo.
- Revisión visual escritorio/móvil sin desbordamientos ni errores JS.
- Gate técnico final: typecheck, lint, build y 630 tests / 70 archivos aprobados.
- Regresión 042: 37 comprobaciones E2E aprobadas, incluidos aislamiento, suspensión, Calendar/formularios intactos y cero comunicaciones sin servicio.
- PR18 integrada: `13066e2a5b7ef5d9b9365a53e787038e64793181`, árbol `680f8e87f35205f89e9e638633130f2b441433d5`, idéntico al probado.
- Producción sigue en la versión042. La revisión automática rechazó modificar el pin de despliegue en Coolify por requerir autorización explícita. Se solicitó al usuario; no se ejecutó ese cambio ni se activaron los servicios.

Límite intencional: reserva durable antes de llamada externa; si Meta acepta y luego se pierde la respuesta, se conserva el intento sin reenvío automático. La aplicación permite revisión y envío manual intencional.
