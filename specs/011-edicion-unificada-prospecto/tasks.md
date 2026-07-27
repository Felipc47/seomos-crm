# Tasks: Edición unificada del prospecto

**Input**: Documentos en `specs/011-edicion-unificada-prospecto/`

## Phase 1: Setup

- [x] T001 Documentar y preparar el self-test fallido en
  `tests/e2e/us24-edicion-prospecto.md` y `.sh`

## Phase 2: API fundacional

- [x] T002 Ampliar y validar el contrato PATCH en
  `src/app/api/contacts/[id]/route.ts`
- [x] T003 Aplicar contacto + etapa atómicamente, manejar duplicados y publicar
  actualización de conversación

## Phase 3: Editor compartido

- [x] T004 Crear `src/components/contacts/prospect-editor-dialog.tsx` con carga
  fresca, validación, motivos, estados de red y accesibilidad

## Phase 4: Integraciones

- [x] T005 [US1] Reemplazar el editor local de Contactos por el compartido
- [x] T006 [US1] Reemplazar el editor parcial de Bandeja por el compartido
- [x] T007 [US1] Añadir acciones de edición a tarjetas y filas del Pipeline
- [x] T008 [US1] Refrescar cada superficie tras guardar

## Phase 5: Verificación

- [x] T009 [US2] Verificar formato, duplicado, etapa negativa, atomicidad y fallo
- [x] T010 [US3] Verificar conservación de historial y estados protegidos
- [x] T011 Validar teclado y anchos 375/768/1440
- [x] T012 Ejecutar typecheck, lint, build, tests y E2E completo

## Dependencies & Execution Order

T001 precede implementación. T002-T003 preceden T004. T004 precede T005-T007.
T008 cierra integraciones. T009-T012 verifican la entrega.

## Verification Results

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm build`: PASS.
- `pnpm test`: PASS — 32 archivos, 169 tests.
- `bash tests/e2e/us24-edicion-prospecto.sh`: PASS — 41 verificaciones.
- `bash tests/e2e/us23-vistas-crm.sh`: PASS — 30 verificaciones de regresión.
- Inspección visual interactiva: PASS en escritorio y móvil; modal sin overflow,
  scroll interno correcto, capa superior y sin errores de consola.
