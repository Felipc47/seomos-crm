# Verificación — 040

Base de entrega: `origin/main` en `4001ae1` (rama aislada `codex/fix-scheduling-context`). Se trasladó únicamente el parche propio desde el workspace con cambios previos; no se incluyeron las otras modificaciones.

## Causa y cambio

La guarda anterior pedía una cita de al menos seis caracteres o una hora textual en mensajes entrantes. «Friday» y «Yes» quedaban fuera incluso cuando identificaban una sola propuesta. La respuesta de respaldo y sus fechas estaban fijas en español.

La nueva validación relaciona la aceptación corta con el último mensaje saliente y compara la fecha, el año y los minutos en la zona de la empresa. Una selección de día debe reducir las opciones a una sola. Rechazos, preguntas, opciones ambiguas, fechas inconsistentes y menciones históricas no autorizan una reserva. Una hora explícita en el turno actual conserva su camino de confirmación. Se localizan todas las salidas propias del servidor en este flujo.

## Gate técnico

- TypeScript sin errores y ESLint completo sin errores.
- Build de producción completo.
- 617/617 unidades, 68 archivos.
- Se ejecutaron los binarios locales equivalentes a los scripts de package.json: pnpm intentaba reinstalar node_modules por diferencias del almacén después del traslado al SSD. No fue necesario reinstalar ni modificar las dependencias.

## Comportamiento observado

48/48 comprobaciones E2E en la rama de entrega, mediante Playwright + webhook WhatsApp + proveedor LLM y Google simulados. La captura se reprodujo y se verificó tanto el mensaje entregado en el outbox como la reunión y su zona horaria en la UI real. La empresa estaba en America/New_York y el navegador en Asia/Tokyo.

- «Friday» tras jueves 1/3 pm y viernes 10 am → reserva inmediata del viernes 10 am.
- Reproducción de la pregunta adicional antigua: «Friday» → «does Friday ... at 10 am work?» → «Yes» → reunión registrada en inglés, sin nuevo listado de horarios.
- Confirma sin Google en CRM y, al conectar Google simulado, crea un solo evento con invitado y Meet. Un conflicto real del mock pide otra hora sin reserva falsa.
- Ambigüedad, rechazo, «?», datetime alterado, pregunta ajena, hora histórica, correo ausente, fecha inválida, antelación y jornada: degradación controlada y sin reserva.
- Formato JSON envuelto en Markdown funciona. Formato persistentemente inválido deriva a humano sin crear reunión ni colgar el servidor.
- Guardas de idioma español/bilingüe y repetición sin reunión duplicada verificadas.

Evidencia local: `.artifacts/scheduling-context/e2e.json` (transcripción y asserts) y `confirmed-desktop.png`. Los datos y credenciales son ficticios. También hubo una primera reproducción de 48/48 sobre el workspace original.

## Estado de publicación

Corrección implementada y verificada localmente sobre main actual. El dueño autorizó pasarla a producción el 2026-11-08. Merge y despliegue en curso; los resultados finales se registran en deployment.md. No se enviaron mensajes reales durante las pruebas.
