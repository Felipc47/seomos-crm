# Despliegue 045 — 2026-11-17

- Producción: `https://seomos.cloud`, app Coolify `ds8dao6gcn8qg4ro04upkgno`, rama `codex/lead-sms-auto-enroll`, commit `93687906af661fb986bd0d84e5edafd66e5cac9f`.
- Migraciones 0041 y 0042 aplicadas; `/api/health` respondió 200; Coolify terminó `finished` y `running:healthy`.
- Lion Data: `preferred_contact_channel=sms`, agente maestro activo. Las demás organizaciones conservan `whatsapp` por defecto. Nuevos contactos SMS con fuente consentida empiezan con IA individual activa; las bajas existentes no se revierten.
- Fuentes autorizadas por confirmación del dueño: formularios Meta `2197445240873841` (Ecommerce) y `1699634375279057` (Integration), y sus dos pestañas Sheets `gss_cfb735cd34c76f2426bb` y `gss_b3dd992ecf71786338d8`. Evidencia registrada como declaración del dueño de aceptación expresa SMS; no se inventó el texto literal del formulario.
- Cada pestaña quedó ligada a su servicio y a su plantilla aprobada. El cron `sheets-contactos` sigue activo cada minuto; la ejecución natural de 01:38 UTC reportó 2 fuentes completadas, 0 fallidas. Las 19 filas históricas conservaron `flow_state=none`.
- La conexión SMS de Lion Data estaba activa con remitente, webhook y saldo guardado; existían mensajes SMS anteriores con estado `delivered`. No se generó un nuevo lead real ni se envió un SMS de prueba en producción durante la verificación, así que la primera bienvenida automática real aún no tiene estado de entrega observable.
- Pruebas locales integradas: 23 comprobaciones E2E con mocks, incluida respuesta de IA sin activar interruptor individual, fallo incierto sin WhatsApp alterno ni reenvío; 630 tests unitarios, typecheck, lint y build verdes.
- Respaldo PostgreSQL previo: `/root/backups/seomos-crm/pre-lead-sms-20261117.dump` en el VPS; no contiene credenciales en este documento.
