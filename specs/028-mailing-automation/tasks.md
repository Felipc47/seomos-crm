# Tasks: Mailing y automatizaciones

## Setup y diseño

- [x] T001 Precisar alcance y registrar spec en `specs/028-mailing-automation/spec.md` (FR-001–019).
- [x] T002 Registrar ampliación constitucional y sincronizar `AGENTS.md`, `CLAUDE.md`, `.specify/memory/constitution.md` (FR-001,003).
- [x] T003 Completar decisiones, modelo, contratos y revisión cruzada en `specs/028-mailing-automation/` (FR-001–019).

## Fundamentos

- [x] T004 Añadir tablas/IDs y generar migración en `src/lib/db/schema.ts`, `src/lib/db/ids.ts`, `drizzle/` (FR-002,014).
- [x] T005 Añadir validación/render, permisos y configuración runtime en `src/lib/mailing.ts`, `src/lib/permissions.ts`, `src/lib/env.ts`, `.env.example`, `.env` (FR-002,007,018).

## US1 — Remitente y audiencia

- [x] T006 [US1] Implementar DNS y envío aislado en `src/lib/resend/mailing.ts` y mock en `src/app/api/dev/resend-mock/` (FR-003,004,018).
- [x] T007 [US1] Implementar listas/suscriptores/importación/permiso en `src/server/mailing/` y `src/app/api/mailing/` (FR-005,006).
- [x] T008 [US1] Añadir UI remitente y audiencia en `src/components/mailing/`, `src/app/(app)/mailing/page.tsx`, `src/components/app-nav.tsx` (FR-001–006).

## US2 — Campañas

- [x] T009 [US2] Implementar borrador/editor/preview/prueba/programación/duplicación en `src/server/mailing/` y `src/components/mailing/` (FR-007,008).
- [x] T010 [US2] Implementar outbox, concurrencia, pausas, cancelación, reintentos y cron en `src/server/mailing/runner.ts`, `src/app/api/cron/sweep/route.ts` (FR-009,014,015).
- [x] T011 [US2] Implementar historial/bajas/eventos firmados en `src/server/mailing/`, `src/app/api/mailing/`, `src/components/mailing/` (FR-010,016,017).

## US3 — Automatizaciones

- [x] T012 [US3] Implementar pasos 7/14/21, activación, altas automáticas e inscripción única en `src/server/mailing/` (FR-011,012).
- [x] T013 [US3] Implementar UI de secuencias e inscripciones, pausa y parada en `src/components/mailing/` (FR-011–013).

## Verify

- [x] T014 Añadir pruebas de render, elegibilidad, tiempos, firma y degradación en `tests/unit/mailing.test.ts` (FR-015–019).
- [x] T015 Crear y ejecutar guion Playwright feliz/infeliz en `tests/e2e/us37-mailing.mjs`, `tests/e2e/us37-mailing.md` (FR-019, SC-001–006).
- [x] T016 Ejecutar gate técnico completo y guardar resultados en `specs/028-mailing-automation/quickstart.md` (FR-019).

## Dependencies

- [x] T017 Añadir habilitación por empresa, migración Seomos y control exclusivo del superadmin (FR-020).
- [x] T018 Verificar UI, URL, API y cron deshabilitados, roles y conservación de datos mediante Playwright (SC-007).
- [x] T019 Ejecutar gate actualizado y desplegar commit selectivo a producción; verificar estado terminal, migraciones, salud y habilitación solo de Seomos (FR-021).

T001–T005 antes de código de dominio. US1 precede envíos de US2/US3; T010 compartido. Pruebas T014 durante implementación; T015–T016 cierran Hecho. Hooks de commit opcionales omitidos para preservar cambios previos sin mezclarlos.

## Evidencia final — 2026-10-08

- Typecheck, lint y build verdes. 329 tests / 48 archivos. Playwright: 165 comprobaciones y cero errores del navegador; evidencia en `.artifacts/us37-mailing/`.
- UI/DNS, importación, consentimiento, campañas, secuencias 7/14/21, baja, pausa, concurrencia, reintentos, reconciliación, roles y aislamiento ejercidos con mocks y BD aislada `seomos_mailing_028`.
- Habilitación desde Empresas, URL/API/nav bloqueadas y cron detenido al retirar acceso; rehabilitar conserva datos y reloj. Empresas nuevas deshabilitadas, solo superadmin otorga acceso.
- Dominios preexistentes de la cuenta Resend solo reutilizables por superadmin; admins de otras empresas no pueden adoptarlos. Respuesta real del proveedor comprobada compatible con validación.
- Cambios locales previos de créditos, inbox y otras specs preservados y excluidos de los commits de release.
- Producción: commit `e5d20adae8db689974ac553001cd2de93ed33c03`, deployment `bnwifwxh0wfsuukule8oick8`, `finished` 22:07:25 UTC; aplicación/BD saludables, sin reinicios.
- Arranque confirmó `[migrate] migraciones aplicadas`; journal productivo comprobado con hashes exactos de las tres migraciones (0026–0028). HTTPS `/api/health` 200 `{ "ok": true }`, Mailing sin sesión 401, mocks en producción 404.
- SELECT productivo confirmó solo SEOMOS (`org_9rtxjmozs3xgoy3bb3z8`, slug `principal`) habilitada; SMANOVA, Baterias Mac Center y Lion Data deshabilitadas. La migración inicial se limita a esa identidad.
- Webhook Resend dedicado configurado; secreto únicamente runtime producción. Firma válida con email desconocido devuelve 200 ignorado; firma falsa 401. No se enviaron emails reales ni cambiaron registros DNS.
- Cron existente cada cinco minutos conservado y ejecución natural verificada 22:10:03–22:10:08 UTC: todos los contadores de Mailing en cero, sin fallos; no se forzaron barridos de WhatsApp/IA.
- Verificación funcional de UI con Playwright local; producción verificada mediante API, BD, logs, dominio HTTPS y firmas. La automatización de Chrome en la sesión abierta estuvo bloqueada por otra interfaz de extensión.

## Aclaración de aislamiento de correo existente

- [x] T020 Proteger dominios preexistentes/transaccionales, preservando remitentes y ajustes del proveedor (FR-022).
- [x] T021 Verificar preservación con mocks, correos transaccionales, gate completo y desplegar ajuste autorizado.

Typecheck, lint y build aprobados; 331 tests / 48 archivos y 168 verificaciones Playwright / cero errores del navegador. E2E comprueba ausencia de PATCH/verify sobre dominio preexistente; prueba unitaria comprueba from transaccional conservado después de enviar con Mailing. Migración 0029 aplicada a la BD aislada y journal productivo confirmado con hash `93d05f50b3971af4c919560a11d3463236800a7dd2487472cedc7fdd08c27efd`.

Follow-up productivo `625694fd3972e51ab12d29cf9cf2cce591da5a96`, deployment `0byl8j22xlgvuuucr9dh5xp7`, finished 22:29:44 UTC; app/BD running:healthy, cero reinicios. Arranque 22:28:42 UTC con migraciones aplicadas y Ready 1070ms, sin errores nuevos. Root verificó siete rutas por HTTPS después de terminal: health200, Mailing/sender401 sin sesión, mocks y lab404; respuestas transitorias 502 observadas durante reemplazo no persistieron. Flags productivos conservan solo SEOMOS true; 37 entradas env sin cambios. Sin escrituras operativas a Resend. La comparación íntegra de dominios antes/después no quedó confirmada porque se incluyeron estados DNS mutables y se perdió baseline al cerrar el script; no se atribuye una causa sin evidencia.

Limpieza operativa confirmada: solo permanece el cron original. DEFAULT false NOT NULL confirmado por DDL y hash aplicado del journal; la lectura adicional de information_schema no retornó por intermitencia de polling y no se afirma como verificación directa. Empresas nuevas deshabilitadas comprobadas en E2E.

## Feedback: demora y navegación

- [x] T022 Iniciar envío inmediato tras confirmar, por empresa/programa, conservando permisos/lock/idempotencia y recuperación.
- [x] T023 Guiar destinatarios/contenido/revisión con preview, envío ahora/programado explícitos, confirmación, progreso y motivos de espera; evitar enviar borradores sin guardar.
- [x] T024 Verificar envío sin forzar cron, fechas futuras, aislamiento, deshabilitación y caminos infelices; gate técnico y capturas desktop/móvil.
- [ ] T025 Desplegar selectivamente y configurar cron dedicado de Mailing cada minuto; verificar producción y preservar correos/entitlements existentes.

Self-test final: 182 comprobaciones, cero errores del navegador; envío inmediato demostrado sin llamar al cron, no procesa otra campaña pendiente, concurrencia sin duplicar, fechas futuras y recuperación tras500/formato/429, UI y permisos. Capturas editor/progreso/confirmación desktop y selector móvil en `.artifacts/us37-mailing/`. Typecheck, lint, build y 331 tests / 48 archivos verdes. Inicio de producción observado con cron de cinco minutos y ejecuciones de segundos; no se forzaron barridos ni emails reales. Pendiente release/cron dedicado.
