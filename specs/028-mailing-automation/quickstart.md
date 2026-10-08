# Verificación y operación

Usar BD aislada de pruebas y Resend mock. No ejecutar guiones antiguos que borran esquemas existentes.

Gate técnico: `pnpm typecheck && pnpm lint && pnpm build && pnpm test`.
Self-test UI: `BASE_URL=http://localhost:3100 node tests/e2e/us37-mailing.mjs`.

Runtime: RESEND_API_KEY con permiso full access para Domains, RESEND_WEBHOOK_SECRET del webhook y AGENT_SWEEP_SECRET del cron. Cada empresa publica registros DNS en su propio proveedor; la aplicación muestra los valores reales. Cron POST /api/cron/sweep cada cinco minutos (cadencia actual de producción). Webhook /api/mailing/webhook con email.sent/delivered/bounced/complained/failed/opened/clicked.

## Resultado verificado — 2026-10-08

- Typecheck, lint y build aprobados.
- 327 pruebas unitarias en 48 archivos aprobadas.
- Playwright: 163 verificaciones aprobadas; 0 errores del navegador.
- Evidencia local: `.artifacts/us37-mailing/result.json`, `desktop.png`, `mobile.png`.
- Base aislada: `seomos_mailing_028`; bases existentes conservadas. Todo envío y DNS contra mocks.
- Rama `codex/028-mailing-automation`, pendiente de despliegue autorizado con permisos por empresa.

## Entorno de herramientas local

En este host, pnpm requiere `pnpm_config_pm_on_fail=ignore` y `npm_config_manage_package_manager_versions=false` para evitar intentar autodescargar otra versión. ESLint resuelve sus plugins con `NODE_PATH=/Users/juancubillos/seomos-crm/node_modules/.pnpm/node_modules`. El build necesita acceso de red para las fuentes Google existentes. No se instalaron dependencias nuevas.

Detener dev antes de build, porque ambos comparten `.next`. Si el guion se repite muchas veces, el límite existente de 10 logins/10 minutos puede responder 429: esperar la ventana o reiniciar únicamente el proceso de pruebas, sin cambiar la protección de auth.

## Activación real

0. En Empresas, el superadmin habilita Mailing por empresa; el piloto inicial es la organización principal de Seomos. Las demás y todas las empresas nuevas permanecen deshabilitadas. Retirar acceso detiene envíos nuevos y conserva datos; bajas/eventos siguen operativos.
1. Publicar esta rama con sus tres migraciones versionadas (`0026`, `0027`, `0028`) usando el deploy habitual.
2. Configurar RESEND_API_KEY full access y RESEND_WEBHOOK_SECRET en runtime del hosting; el placeholder local no habilita webhooks.
3. Configurar el webhook `/api/mailing/webhook` y cron `/api/cron/sweep` cada cinco minutos (cadencia actual de producción) con el Bearer existente AGENT_SWEEP_SECRET.
4. En Mailing → Remitente y DNS, cada admin elige dominio/dirección y publica los registros mostrados en su proveedor DNS. Comprobar DNS hasta estado Verificado; elegir aperturas/clics si quiere medirlos.
5. Añadir listas con permiso de email, guardar borrador, enviar prueba al operador y confirmar campaña/inscripción. Las secuencias cuentan días desde inscripción, no antigüedad en WhatsApp.

La aplicación gestiona dominio, dirección y métricas de mailing por empresa; RESEND_FROM_* conserva su función transaccional existente. Cambiar de dominio requiere verificar nuevamente el nuevo dominio; snapshots en reintento no se migran silenciosamente a otra dirección.
