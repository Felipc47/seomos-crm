# Verificación y operación

Usar BD aislada de pruebas y Resend mock. No ejecutar guiones antiguos que borran esquemas existentes.

Gate técnico: `pnpm typecheck && pnpm lint && pnpm build && pnpm test`.
Self-test UI: `BASE_URL=http://localhost:3100 node tests/e2e/us37-mailing.mjs`.

Runtime: RESEND_API_KEY con permiso full access para Domains, RESEND_WEBHOOK_SECRET del webhook y AGENT_SWEEP_SECRET del cron. Cada empresa publica registros DNS en su propio proveedor; la aplicación muestra los valores reales. Cron POST /api/cron/sweep cada cinco minutos (cadencia actual de producción). Webhook /api/mailing/webhook con email.sent/delivered/bounced/complained/failed/opened/clicked.

## Resultado verificado — 2026-10-08

- Typecheck, lint y build aprobados.
- 329 pruebas unitarias en 48 archivos aprobadas.
- Playwright: 165 verificaciones aprobadas; 0 errores del navegador.
- Evidencia local: `.artifacts/us37-mailing/result.json`, `desktop.png`, `mobile.png`.
- Base aislada: `seomos_mailing_028`; bases existentes conservadas. Todo envío y DNS contra mocks.
- Rama `codex/028-mailing-automation`; release productiva `e5d20ad` verificada, solo SEOMOS habilitada.

## Entorno de herramientas local

En este host, pnpm requiere `pnpm_config_pm_on_fail=ignore` y `npm_config_manage_package_manager_versions=false` para evitar intentar autodescargar otra versión. ESLint resuelve sus plugins con `NODE_PATH=/Users/juancubillos/seomos-crm/node_modules/.pnpm/node_modules`. El build necesita acceso de red para las fuentes Google existentes. No se instalaron dependencias nuevas.

Detener dev antes de build, porque ambos comparten `.next`. Si el guion se repite muchas veces, el límite existente de 10 logins/10 minutos puede responder 429: esperar la ventana o reiniciar únicamente el proceso de pruebas, sin cambiar la protección de auth.

## Uso en producción

Producción: https://seomos.cloud/mailing. Release `e5d20adae8db689974ac553001cd2de93ed33c03`, deployment `bnwifwxh0wfsuukule8oick8` terminado y saludable. Migrations 0026–0028 al arrancar. Health HTTPS 200; API sin sesión 401; mocks404.

1. En Empresas, el superadmin habilita Mailing por empresa. El piloto inicial es SEOMOS, organización principal; las demás y todas las empresas nuevas permanecen deshabilitadas. Retirar acceso detiene nuevos envíos y conserva datos; bajas/eventos siguen operativos.
2. En Mailing → Remitente y DNS, elegir dominio y dirección. El superadmin puede reutilizar los dominios existentes de Resend (seomos.cloud / crm.seomos.cloud ya verificados). Dominios nuevos requieren publicar los registros reales mostrados y comprobar verificación. Elegir aperturas/clics si se desea medirlos.
3. Añadir listas con permiso de email, guardar borrador, enviar prueba al operador y confirmar campaña/inscripción. Las secuencias cuentan días desde inscripción.

RESEND_API_KEY existente comprobada y RESEND_WEBHOOK_SECRET configurado solo en runtime producción; webhook `/api/mailing/webhook` configurado para sent/delivered/bounced/complained/failed/opened/clicked. Firma válida200, falsa401 comprobadas sin emails reales. Cron POST `/api/cron/sweep` cada cinco minutos ya configurado con AGENT_SWEEP_SECRET; preservado sin disparar barridos extras; ejecución natural 22:10 UTC verificada con Mailing sin pendientes, aceptados ni fallos.

La aplicación gestiona dominio, dirección y métricas por empresa; RESEND_FROM_* conserva su función transaccional. Cambiar dominio exige nueva verificación; snapshots en reintento no se migran silenciosamente a otra dirección. La dirección concreta de marketing queda a elección del administrador.
