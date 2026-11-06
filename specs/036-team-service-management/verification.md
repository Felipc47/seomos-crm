# Verificación 036 — 2026-11-06

Estado: implementado y verificado localmente. Sin despliegue ni modificaciones de cuentas reales de producción.

- PostgreSQL aislado `seomos_team_036`, Next `127.0.0.1:3107`, Meta e IA mocks. Email/Google deshabilitados, sin envíos ni costes externos.
- E2E principal: **51/51**. Todos los roles y legado por unidades, asignación real por handoff a los cuatro roles, persistencia, edición/cancelación, correo inválido/duplicado y rollback, revocación de sesión por cambio de correo, eliminación/cancelación/error de red/reintento, liberación de servicios/prospectos sin borrar historial, pérdida de acceso y cierre de SSE abierto. Aislamiento, cuenta compartida, admins concurrentes y responsive 390 px.
- E2E admins por empresa: **26/26**. Empresas ficticias Baterías Conecta QA y Lion Data QA, cada una con su administrador normal (`is_superadmin=false`). En ambas se ejercieron la creación de equipo, asignación a Admin/Comercial/Marketing/Editor, modificación y eliminación desde la interfaz. Se rechazaron edición, eliminación y asignación cruzadas en ambos sentidos.
- Sin errores de ejecución en el navegador. Capturas de escritorio/móvil revisadas visualmente.
- Evidencia: `.artifacts/us45-team-services/behavior.log`, `tenant-admins.log`, `desktop.png`, `mobile-edit.png`, `mobile-services.png`, `tenant-0-admin.png`, `tenant-1-admin.png`.
- Gate técnico: typecheck, lint, build y **454/454** pruebas unitarias (56 archivos). Se desactivó únicamente la reinstalación automática de pnpm 11 con `pnpm_config_verify_deps_before_run=false`; no se cambiaron dependencias ni lockfile.

La eliminación retira la membresía de la empresa, conserva la identidad global y deja servicios/prospectos sin asignar. Las cuentas compartidas entre empresas admiten solo edición de rol local. Se protege al superadmin, al último admin y la eliminación de uno mismo.

Se preservaron los cambios ajenos que ya existían en el árbol. Antes de publicar, aislar los cambios de 036; no desplegar en bloque el árbol de trabajo actual.
