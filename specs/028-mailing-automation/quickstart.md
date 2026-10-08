# Verificación y operación

Usar BD aislada de pruebas y Resend mock. No ejecutar guiones antiguos que borran esquemas existentes.

Gate técnico: `pnpm typecheck && pnpm lint && pnpm build && pnpm test`.
Self-test UI: `BASE_URL=http://localhost:3100 node tests/e2e/us37-mailing.mjs`.

Runtime: RESEND_API_KEY con permiso full access para Domains, RESEND_WEBHOOK_SECRET del webhook y AGENT_SWEEP_SECRET del cron. Cada empresa publica registros DNS en su propio proveedor; la aplicación muestra los valores reales. Cron POST /api/cron/sweep cada cinco minutos (cadencia actual de producción). Webhook /api/mailing/webhook con email.sent/delivered/bounced/complained/failed/opened/clicked.

## Resultado verificado — 2026-10-08

- Typecheck, lint y build aprobados.
- 331 pruebas unitarias en 48 archivos aprobadas.
- Playwright: 182 verificaciones aprobadas; 0 errores del navegador. Incluye envío inmediato, programación y UX, preservación de dominios existentes y del remitente transaccional.
- Evidencia local: `.artifacts/us37-mailing/result.json`, `desktop.png`, `mobile.png`.
- Base aislada: `seomos_mailing_028`; bases existentes conservadas. Todo envío y DNS contra mocks.
- Rama `codex/028-mailing-automation`; release productiva `ee125e1` verificada, habilitación por empresa conservada.

## Entorno de herramientas local

En este host, pnpm requiere `pnpm_config_pm_on_fail=ignore` y `npm_config_manage_package_manager_versions=false` para evitar intentar autodescargar otra versión. ESLint resuelve sus plugins con `NODE_PATH=/Users/juancubillos/seomos-crm/node_modules/.pnpm/node_modules`. El build necesita acceso de red para las fuentes Google existentes. No se instalaron dependencias nuevas.

Detener dev antes de build, porque ambos comparten `.next`. Si el guion se repite muchas veces, el límite existente de 10 logins/10 minutos puede responder 429: esperar la ventana o reiniciar únicamente el proceso de pruebas, sin cambiar la protección de auth.

## Uso en producción

Producción: https://seomos.cloud/mailing. Release `ee125e1af958e4e373be9ecb984eb8a20c608cc8`, deployment `8s6yfx5zmt8l87pzm2pxnuas` terminado 2026-10-08 18:10:40 Colombia y saludable. Migraciones 0026–0029 comprobadas previamente en journal; sin migraciones nuevas para este ajuste. Health HTTPS 200; API sin sesión 401; mocks404.

1. En Empresas, el superadmin habilita Mailing por empresa. El piloto inicial es SEOMOS, organización principal; las demás y todas las empresas nuevas permanecen deshabilitadas. Retirar acceso detiene nuevos envíos y conserva datos; bajas/eventos siguen operativos.
2. En Mailing → Remitente y DNS, elegir dominio y dirección. El superadmin puede reutilizar los dominios existentes de Resend (seomos.cloud / crm.seomos.cloud ya verificados) preservando sus ajustes actuales. Dominios nuevos requieren publicar los registros reales mostrados y comprobar verificación. Las opciones de aperturas/clics se pueden ajustar solo en dominios creados exclusivamente para Mailing.
3. Añadir listas con permiso de email, guardar borrador, enviar prueba al operador y confirmar campaña/inscripción. Las secuencias cuentan días desde inscripción.

RESEND_API_KEY existente comprobada y RESEND_WEBHOOK_SECRET configurado solo en runtime producción; webhook `/api/mailing/webhook` configurado para sent/delivered/bounced/complained/failed/opened/clicked. Firma válida200, falsa401 comprobadas sin emails reales. Cron POST `/api/cron/sweep` cada cinco minutos ya configurado con AGENT_SWEEP_SECRET; preservado sin disparar barridos extras; ejecución natural 22:10 UTC verificada con Mailing sin pendientes, aceptados ni fallos.

La dirección de Mailing es independiente del correo existente: avisos, resúmenes y recuperación de contraseña conservan RESEND_FROM_* y su adaptador actual. Añadir registros DNS de envío no exige reemplazar los registros de correo existentes. En dominios compartidos, Mailing solo consulta el estado y conserva métricas/configuración del proveedor. Cambiar dominio exige confirmar verificación; snapshots en reintento no se migran silenciosamente a otra dirección. La dirección concreta de marketing queda a elección del administrador.

Verificación del ajuste de aislamiento: las 37 entradas de variables de Coolify permanecen iguales antes/después. Las operaciones del despliegue no escribieron a Resend. La comparación completa de dominios no quedó confirmada: el script incluyó estados mutables de DNS y cerró sin conservar baseline/diferencias. No se atribuye la diferencia a DNS ni se afirma igualdad completa antes/después de todos los campos del proveedor. La protección del código se verificó con mocks (cero PATCH/verify en dominio preexistente) y correo transaccional con su remitente global. Evidencia HTTP posterior al rollout: `.artifacts/us37-mailing/production-isolation-http.json`, siete comprobaciones verdes a las 22:30:37 UTC.

## Mejora de envío inmediato y UX — desplegada y verificada

Enviar ahora inicia un barrido por empresa/campaña tras confirmar, sin esperar el ciclo de cinco minutos. Persistencia/lock/idempotencia y cron siguen recuperando pendientes. Configurar cron dedicado POST `/api/cron/mailing` cada minuto con Bearer AGENT_SWEEP_SECRET; únicamente Mailing, sin reemplazar el cron original. No añadir variables nuevas ni enviar correos manuales durante deploy. Programaciones se comprueban cada minuto desde su fecha; las campañas grandes se procesan gradualmente.

Flujo: Destinatarios → Contenido → Revisar y enviar. Guardar borrador habilita pruebas al operador y confirmación; cambios sin guardar bloquean ambas. Elegir Enviar ahora o Programar para después, revisar diálogo y confirmar. Vista previa incluye nombre de ejemplo y baja; seguimiento distingue procesamiento, aceptación/entrega, fechas futuras y reintentos. UI refresca cada cinco segundos cuando visible. Capturas `desktop.png`, `progress-desktop.png`, `confirmation-desktop.png`, `mobile.png`; gate final verde y 182 comprobaciones en `result.json`.

Cron dedicado `mailing-pendientes` activo cada minuto, timeout90s, task `a09xnte1qvucc4reoo17cslt`. Ejecuciones naturales 18:12 y18:13 Colombia exitosas, sin pendientes aceptados ni fallos. Cron original y 37 entradas env preservados exactamente. Ocho pruebas HTTPS posteriores al deployment aprobadas en `production-ux-http.json`; no se dispararon campañas/pruebas reales manualmente ni se modificó proveedor/DNS/remitentes. Recargar la página permite obtener la interfaz nueva en sesiones que tenían los archivos previos.
