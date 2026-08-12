# US30 — Avisos y resumen semanal por email

## Objetivo

Verificar que un lead nuevo avisa por Resend al administrador y, tras la asignación, a su responsable; que los resúmenes semanales separan responsables y empresas; y que las repeticiones o fallos del proveedor no duplican ni revierten datos.

## Cobertura observable

- Alta real por el mock de WhatsApp y presencia del lead en Bandeja.
- Email navegable al owner y luego al responsable.
- Repetición del webhook y de la asignación sin duplicados.
- Segunda organización con destinatarios y contenido aislados.
- Panorama del owner, resumen personal y panorama de cero/actividad por tenant.
- Tres ejecuciones del cron con una sola entrega por período.
- HTTP 500 forzado en Resend: lead conservado y error sanitizado.
- Secreto incorrecto del cron: 404.

## Ejecución

Levantar la app con PostgreSQL local de pruebas y:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/vocero \
APP_BASE_URL=http://localhost:3100 \
WA_MOCK_ENABLED=true \
RESEND_API_KEY=re_test \
RESEND_FROM_EMAIL=notificaciones@example.test \
RESEND_BASE_URL=http://localhost:3100/api/dev/resend-mock \
AGENT_SWEEP_SECRET=test-sweep-secret-020 \
pnpm dev --port 3100

BASE_URL=http://localhost:3100 bash tests/e2e/us30-email-notifications.sh
```
