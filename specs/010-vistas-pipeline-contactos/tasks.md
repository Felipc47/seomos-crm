# Tasks: Vistas de pipeline y contactos

**Input**: Design documents from `specs/010-vistas-pipeline-contactos/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/ui-contract.md`, `quickstart.md`

## Phase 1: Setup

- [x] T001 Documentar el flujo E2E inicialmente fallido en `tests/e2e/us23-vistas-crm.md` y `tests/e2e/us23-vistas-crm.sh`

## Phase 2: Foundational

- [x] T002 Crear el selector segmentado accesible en `src/components/ui/view-toggle.tsx`
- [x] T003 Crear la persistencia validada de preferencias en `src/components/use-view-preference.ts`

## Phase 3: User Story 1 — Vistas del pipeline (P1)

**Goal**: Alternar Tablero/Lista conservando búsqueda, movimiento y reglas de
cierre.

**Independent Test**: Ejecutar la sección Pipeline del self-test y comprobar
equivalencia de resultados, movimiento normal, cancelación y cierre negativo.

- [x] T004 [US1] Añadir el selector y la lista responsive del pipeline en `src/components/pipeline/pipeline-client.tsx`
- [x] T005 [US1] Verificar Tablero/Lista y cambios de etapa en `tests/e2e/us23-vistas-crm.sh`

## Phase 4: User Story 2 — Vistas de contactos (P2)

**Goal**: Alternar Lista/Cuadrícula conservando filtros y acciones.

**Independent Test**: Ejecutar la sección Contactos del self-test y ejercer
detalle, edición, chat, archivo y eliminación cancelada desde la cuadrícula.

- [x] T006 [US2] Añadir el selector y la cuadrícula responsive en `src/components/contacts/contacts-client.tsx`
- [x] T007 [US2] Verificar Lista/Cuadrícula, filtros y acciones en `tests/e2e/us23-vistas-crm.sh`

## Phase 5: User Story 3 — Persistencia segura (P3)

**Goal**: Restaurar cada preferencia y degradar al default ante valores inválidos.

**Independent Test**: Recargar ambas rutas, validar restauración independiente e
inyectar valores desconocidos sin errores.

- [x] T008 [US3] Verificar persistencia, independencia y fallback en `tests/e2e/us23-vistas-crm.sh`

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T009 Validar teclado, nombres accesibles y anchos 375/768/1440 según `specs/010-vistas-pipeline-contactos/quickstart.md`
- [x] T010 Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm build` y `pnpm test`
- [x] T011 Completar el self-test de comportamiento y registrar resultados en `specs/010-vistas-pipeline-contactos/tasks.md`

## Dependencies & Execution Order

- T001 precede la implementación para fijar el contrato observable.
- T002 y T003 son fundacionales y pueden realizarse en paralelo.
- T004 y T006 dependen de T002-T003, pero son independientes entre sí.
- T005 depende de T004; T007 depende de T006.
- T008 depende de las dos integraciones.
- T009-T011 cierran la funcionalidad completa.

## Parallel Opportunities

- T002 y T003 modifican archivos distintos.
- T004 y T006 modifican pantallas distintas después de completar la base.

## Implementation Strategy

1. Crear primero el self-test y comprobar que las opciones aún no existen.
2. Implementar el control y persistencia compartidos.
3. Completar y verificar pipeline.
4. Completar y verificar contactos.
5. Ejecutar persistencia, fallo controlado, responsive, accesibilidad y gate.

## Format Validation

Todas las tareas usan checkbox, ID secuencial, etiqueta de historia cuando
corresponde y ruta concreta.

## Verification Results

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm build`: PASS.
- `pnpm test`: PASS — 32 archivos, 169 tests.
- `bash tests/e2e/us23-vistas-crm.sh`: PASS — 30 verificaciones.
- Inspección visual en navegador: PASS — Tablero, Lista y Cuadrícula sin errores
  de consola; se eliminó la duplicación de notas detectada durante el pulido.
- Responsive: PASS a 375, 768 y 1440 px sin overflow horizontal en las vistas
  nuevas.
