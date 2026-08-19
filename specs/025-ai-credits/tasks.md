# Tasks: Créditos de IA por empresa

**Input**: Design documents from `/specs/025-ai-credits/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api.md`

## Phase 1: Foundation

- [x] T001 [US1] Añadir cuentas, movimientos, checks, índices y motivo de handoff en `src/lib/db/schema.ts` y prefijo en `src/lib/db/ids.ts`.
- [x] T002 [US1] Generar y revisar la migración `drizzle/0025_*.sql`, incluyendo 1.000 créditos para organizaciones existentes.
- [x] T003 [US1] Crear el servicio transaccional e idempotente de consulta, consumo y recarga en `src/server/ai/credits.ts`.
- [x] T004 [US1] Crear cuentas con saldo 0 al sembrar organizaciones en `src/server/auth/on-signup.ts`.

## Phase 2: User Story 1 - Limitar consumo

- [x] T005 [US1] Reservar un crédito por intervención real antes del LLM y omitir sandbox por turno en `src/server/ai/pipeline.ts`.
- [x] T006 [US1] Añadir pruebas de atomicidad, idempotencia y aislamiento en `tests/unit/ai-credits.test.ts`.

## Phase 3: User Story 2 - Consultar y recargar

- [x] T007 [US2] Exponer saldos en `src/app/api/admin/companies/route.ts` y crear `src/app/api/admin/companies/[id]/credits/route.ts` con autorización y validación.
- [x] T008 [US2] Añadir saldo y recarga a `src/components/companies/companies-client.tsx`.
- [x] T009 [US2] Exponer el saldo propio en `src/app/api/agent/profile/route.ts` y explicarlo en `src/components/agent/agent-client.tsx`.

## Phase 4: User Story 3 - Agotamiento seguro

- [x] T010 [US3] Aplicar el handoff `creditos` antes del proveedor y mostrar su etiqueta en `src/components/inbox/contact-panel.tsx` y tipos relacionados.
- [x] T011 [US3] Verificar que saldo cero no llama al mock IA ni envía respuesta en el self-test de `tests/e2e/ai-credits.md`.

## Phase 5: User Story 4 - Seguimientos

- [x] T012 [US4] Cobrar un crédito solo al seguimiento contextual LLM y registrar omisión por saldo en `src/server/ai/follow-up.ts`.

## Phase 6: Verification

- [x] T015 Ejecutar `pnpm db:generate` y confirmar que la migración es re-ejecutable en el arranque.
- [x] T016 Ejecutar `pnpm typecheck && pnpm lint && pnpm build && pnpm test` y corregir hasta verde.
- [x] T017 Ejecutar el self-test Playwright + mocks de `specs/025-ai-credits/quickstart.md`, camino feliz e insuficiencia, y guardar evidencia no sensible en `output/`.
- [x] T018 Actualizar estos checks, el estado del spec y la memoria solo si aparece un gotcha reusable.

## Phase 7: User Story 5 - Retiro del Laboratorio

- [x] T019 [US5] Eliminar handlers `/api/lab/*` y el motor `src/server/lab/` para impedir cualquier corrida o llamada al proveedor.
- [x] T020 [US5] Retirar juez, personas, soporte del mock, limpieza de corridas y datos de demostración del Laboratorio.
- [x] T021 [US5] Eliminar el costo `lab_run` del servicio, contrato y UI de créditos.
- [x] T022 [US5] Actualizar documentación activa y conservar solo los guardarraíles `is_test` para datos históricos.
- [x] T023 [US5] Verificar 404 de todas las rutas históricas, cero llamadas IA y saldo sin cambios; ejecutar gate completo.

## Dependencies & Execution Order

- T001–T004 bloquean consumidores y UIs.
- T005/T006 habilitan el límite principal.
- T007–T009 dependen del servicio T003.
- T010 depende de T005.
- T012 depende de T003.
- T015–T018 cierran la feature después de todas las historias.
- T019–T023 documentan y verifican la decisión posterior de retirar el Laboratorio.
