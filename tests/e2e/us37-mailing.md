# US37 — Mailing exclusivo con remitente DNS y secuencias

Guion ejecutable: `BASE_URL=http://localhost:3100 node tests/e2e/us37-mailing.mjs`.
Solo localhost; preparar BD nueva `seomos_mailing_028` y migraciones. No borra esquemas ni datos existentes. Configuración pública de pruebas:

```bash
DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seomos_mailing_028
APP_BASE_URL=http://localhost:3100
WA_MOCK_ENABLED=true
META_GRAPH_BASE_URL=http://localhost:3100/api/dev/wa-mock
OPENROUTER_BASE_URL=http://localhost:3100/api/dev/ai-mock
OPENROUTER_API_TOKEN=test-token
OPENROUTER_MODEL=test-model
RESEND_API_KEY=re_test
RESEND_FROM_EMAIL=notificaciones@example.test
RESEND_BASE_URL=http://localhost:3100/api/dev/resend-mock
RESEND_WEBHOOK_SECRET=whsec_dGVzdC1tYWlsaW5nLXNpZ25pbmcta2V5LTAyOA==
AGENT_SWEEP_SECRET=mailing028-test-sweep
```

Ejercer UI real: remitente, registros y verificación DNS; lista; contacto solo email; importación CSV y dedup; editor/preview/prueba/campaña; secuencia 7/14/21; pausa/reanudación e inscripción automática. Camino infeliz: DNS pendiente, correo de otro dominio, sin permiso/baja, 500/formato inesperado, firma falsa, secreto cron inválido, tenant ajeno y rol no autorizado. Cron concurrente y repetido no duplica. Eventos firmados distinguen aceptación/entrega/apertura/clic/queja. Capturas desktop/móvil y JSON en `.artifacts/us37-mailing/`.

Habilitación por empresa: desde Empresas superadmin enciende Mailing; empresa deshabilitada carece de navegación y URL/API (404), cron no envía. Rehabilitar conserva inscripciones. Empresas nuevas deshabilitadas, admin no puede habilitarse ni otra empresa (403). Boolean inválido 422, empresa inexistente 404.
