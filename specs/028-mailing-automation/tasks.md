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
- [ ] T019 Ejecutar gate actualizado y desplegar commit selectivo a producción; verificar estado terminal, migraciones, salud y habilitación solo de Seomos (FR-021).

T001–T005 antes de código de dominio. US1 precede envíos de US2/US3; T010 compartido. Pruebas T014 durante implementación; T015–T016 cierran Hecho. Hooks de commit opcionales omitidos para preservar cambios previos sin mezclarlos.

## Evidencia de verificación

- Typecheck, lint y build: verdes. Build requirió acceso de red para descargar Nunito/Poppins existentes; no se modificaron fuentes ni dependencias.
- Suite completa: 327 tests / 48 archivos verdes, incluidas 9 pruebas nuevas de mailing.
- E2E final: 141 verificaciones verdes, incluido consentimiento, campañas, cron concurrente, DNS, secuencia 7/14/21, pausa, baja, inscripción automática, reconciliación, 429, métricas, aislamiento, roles y móvil.
- Correcciones surgidas del self-test: parámetros Date en SQL de consentimiento; valor de inscripción automática al abrir borrador; IDs únicos del mock entre reinicios.
- Se mantiene la limitación de login existente; reiniciar el servidor local tras repeticiones evita que el guion confunda 429 con un fallo de rol. No se debilita auth.
- No se registraron dominios reales, enviaron emails reales ni desplegó producción.

## Habilitación — verificación actualizada

- Typecheck/lint/build y 327 tests verdes. E2E repetido sobre versión final: 163 comprobaciones verdes, sin errores del navegador.
- Cierre de acceso verificado en UI, URL, API, configuración DNS y cron; rehabilitar conserva inscripciones.
- Empresas nuevas deshabilitadas; propietario de empresa no puede auto-habilitarse ni habilitar otro tenant.
- Identidad inicial seleccionada para producción: `org_9rtxjmozs3xgoy3bb3z8`, slug `principal`, instancia Seomos. Default de columna false y migración se limita a esa identidad; no habilita por coincidencia de nombres.
- Publicación autorizada pendiente de commit selectivo y rollout terminal.
