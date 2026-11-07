# Verificación 037 — 2026-11-07

Entrega aislada sobre `origin/main` (938aaf4), rama `codex/company-service-control`. Se conservaron las mejoras recientes de timezone, ecommerce, SMS y agente. No se ha integrado a main ni desplegado, y no se cambió el estado de empresas de producción.

## Gate técnico

- `pnpm --config.verify-deps-before-run=false typecheck`: aprobado.
- `pnpm --config.verify-deps-before-run=false lint`: aprobado.
- `pnpm --config.verify-deps-before-run=false build`: aprobado.
- `pnpm --config.verify-deps-before-run=false test`: **588 pruebas / 67 archivos aprobados**.
- Lint adicional de los drivers E2E y `git diff --check`: aprobados.

El flag evita que pnpm reinstale automáticamente dependencias existentes antes de correr los scripts; no omite ninguna comprobación de código.

## Comportamiento real

`tests/e2e/us46-company-service.mjs`: **38 comprobaciones aprobadas**, sin errores JavaScript. Chrome headless, interfaz real en desktop/móvil, puerto local 3108, BD exclusiva `seomos_company_service_037_release`, WhatsApp y LLM apuntando a mocks locales. Los drivers rechazan hosts o bases ajenos al entorno local dedicado. No hubo llamadas a proveedores reales.

Comprobados: botones y diálogo en Empresas; mantenimiento, pago pendiente y aviso personalizado; vista previa y edición del aviso; sesiones existentes/nuevas; bloqueo de APIs privadas, SSE y plugin de organizaciones; aislamiento entre dos empresas; fallo de red/HTTP recuperable; reactivación con la misma sesión; conservación de contactos, mensajes y créditos; webhooks bloqueados durante la pausa y operativos tras reactivar; protección de empresa propia/eliminada y solicitudes inválidas/anónimas. Unitarias adicionales verifican que una empresa suspendida no consume LLM ni envía a Graph aunque las credenciales ya estuvieran cargadas.

Migración aditiva `0037_sturdy_hemingway.sql` aplicada a la BD local dedicada. Tres columnas nullable: todas las empresas existentes siguen activas.

Evidencia visual revisada en `.artifacts/us46-company-service/`: `suspension-dialog.png`, `companies-desktop.png`, `companies-mobile.png`, `notice-desktop.png`, `notice-mobile.png`. Capturas locales ignoradas por Git; disponibles en el worktree del SSD.

## Límites operativos

Las peticiones ya enviadas a un proveedor no pueden retirarse. Las campañas WhatsApp en curso detectan la pausa y requieren reanudación explícita; el resto de tareas pendientes se evalúa de nuevo al reactivar, respetando sus ventanas y reglas existentes. Los usuarios ven la pantalla de aviso en hasta 15 segundos o al volver a la pestaña; el bloqueo del servidor se comprueba en cada petición.
