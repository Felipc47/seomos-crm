# Verificación

2026-11-12. Checkout aislado, sin datos de clientes en pruebas.

- E2E Playwright 043: 33 comprobaciones aprobadas. Flujo UI → Sheets → contacto/lead/conversación → correo interno y plantilla del servicio → respuesta → responsable. Llegadas Meta/Sheets y dos fuentes concurrentes producen un saludo y un aviso por destinatario. Repetición, reserva previa y resultado incierto no provocan otro intento automático.
- Historial previo, cambios de servicio y activación posterior no generan comunicación retroactiva.
- Fallos de correo/WhatsApp y Sheets se degradan conservando contacto y resultados observables; baja, archivo y bloqueo impiden saludo.
- Revisión visual escritorio/móvil sin desbordamientos ni errores JS.
- Gate técnico final: typecheck, lint, build y 630 tests / 70 archivos aprobados.
- Regresión 042: 37 comprobaciones E2E aprobadas, incluidos aislamiento, suspensión, Calendar/formularios intactos y cero comunicaciones sin servicio.
- Producción: pendiente.

Límite intencional: reserva durable antes de llamada externa; si Meta acepta y luego se pierde la respuesta, se conserva el intento sin reenvío automático. La aplicación permite revisión y envío manual intencional.
