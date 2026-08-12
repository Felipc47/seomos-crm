# Tasks: Notificaciones y resumen semanal por email

**Input**: Design documents from `/specs/020-email-notifications/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 1: Setup

- [x] T001 Registrar la enmienda constitucional 1.4.0 y sincronizar `AGENTS.md` y `CLAUDE.md`
- [x] T002 Documentar configuración opcional de Resend en `.env.example` y placeholder guiado en `.env`

## Phase 2: Foundational

- [x] T003 Añadir `email_delivery` e ID `eml_` en `src/lib/db/schema.ts` y `src/lib/db/ids.ts`
- [x] T004 Generar la migración versionada de `email_delivery` en `drizzle/`
- [x] T005 [P] Validar variables y estado de configuración de Resend en `src/lib/env.ts`
- [x] T006 [P] Implementar cliente HTTP Resend con timeout, respuesta robusta y secreto server-only en `src/lib/resend/client.ts`
- [x] T007 Implementar reserva idempotente y transición sanitizada de entregas en `src/server/email/delivery.ts`

## Phase 3: User Story 1 - Aviso inmediato de un nuevo lead (P1)

**Goal**: Administradores y responsable reciben exactamente un aviso navegable por lead.

**Independent Test**: Crear, asignar y repetir un lead contra el mock; observar un email por destinatario y ninguna duplicación.

- [x] T008 [P] [US1] Escribir pruebas de destinatarios, escape y deduplicación en `tests/unit/email-notifications.test.ts`
- [x] T009 [P] [US1] Crear buzón Resend mock protegido en `src/app/api/dev/resend-mock/route.ts` y `src/app/api/dev/resend-mock/emails/route.ts`
- [x] T010 [US1] Implementar selección tenant-safe y contenido de nuevo lead en `src/server/email/new-lead.ts`
- [x] T011 [US1] Disparar aviso al ganar la creación idempotente en `src/server/inbox/lead-activity.ts`
- [x] T012 [US1] Disparar aviso al primer responsable automático o manual en `src/server/services/ai-routing.ts` y `src/server/inbox/assignment.ts`

## Phase 4: User Story 2 - Resumen semanal por responsable (P2)

**Goal**: Cada responsable con actividad recibe solo su semana cerrada.

**Independent Test**: Dos responsables y dos tenants producen resúmenes separados con totales exactos y sin datos cruzados.

- [x] T013 [P] [US2] Añadir pruebas de cálculo semanal, agrupación y límite de detalle en `tests/unit/email-notifications.test.ts`
- [x] T014 [US2] Implementar períodos locales y consulta de leads por responsable en `src/server/email/weekly-digest.ts`
- [x] T015 [US2] Renderizar y entregar resumen personal idempotente en `src/server/email/weekly-digest.ts`

## Phase 5: User Story 3 - Panorama semanal de administración (P3)

**Goal**: Cada owner recibe el panorama completo y de cero actividad de su empresa.

**Independent Test**: El owner recibe totales/estados/carga/no asignados; un owner-responsable no recibe resumen redundante.

- [x] T016 [P] [US3] Añadir pruebas de panorama administrativo y exclusión owner-responsable en `tests/unit/email-notifications.test.ts`
- [x] T017 [US3] Implementar panorama completo y correo de cero actividad en `src/server/email/weekly-digest.ts`
- [x] T018 [US3] Integrar el ciclo semanal tolerante a fallos en `src/app/api/cron/sweep/route.ts`

## Phase 6: Polish & Verification

- [x] T019 Añadir self-test feliz, aislamiento, repetición y fallo del proveedor en `tests/e2e/us30-email-notifications.sh`
- [x] T020 Documentar el guion E2E en `tests/e2e/us30-email-notifications.md` y operación del cron/Resend en `.env.example`
- [x] T021 Ejecutar `pnpm typecheck && pnpm lint && pnpm build && pnpm test` y corregir hasta verde
- [x] T022 Ejecutar `bash tests/e2e/us30-email-notifications.sh` con mock, verificar camino feliz e infeliz y actualizar este archivo

## Dependencies & Execution Order

- T001–T002 preparan gobierno/configuración.
- T003–T007 bloquean las tres historias.
- US1 (T008–T012) es el MVP y precede a la integración E2E.
- US2 (T013–T015) y US3 (T016–T018) comparten `weekly-digest.ts` y se ejecutan secuencialmente.
- T019–T022 cierran la definición reforzada de Hecho.

## Parallel Opportunities

- T005 y T006 pueden avanzar en archivos distintos tras definir el contrato.
- T008 y T009 pueden escribirse en paralelo antes de T010.
- Las pruebas T013/T016 pueden prepararse antes de su implementación, sin editar simultáneamente el mismo archivo.

## Implementation Strategy

1. Completar infraestructura idempotente y configuración segura.
2. Entregar US1 y validarla contra el mock como MVP.
3. Añadir US2 y US3 sobre el mismo agregado semanal.
4. Ejecutar gate técnico y self-test completo, iterando hasta verde.
