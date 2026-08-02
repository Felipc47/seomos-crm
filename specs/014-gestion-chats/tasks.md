# Tasks: Gestión y moderación de chats en Bandeja

**Input**: Documentos en `specs/014-gestion-chats/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/http.md`, `quickstart.md`

**Tests**: La constitución y la especificación exigen unitarias, E2E con mocks,
casos infelices, gate técnico y verificación visual real.

## Phase 1: Setup

**Purpose**: Preparar contratos y prueba de comportamiento.

- [x] T001 Verificar rama, worktree, esquema, DTOs, rutas de Bandeja y caminos de salida en `src/` y `tests/`
- [x] T002 [P] Crear el guion de comportamiento en `tests/e2e/us27-gestion-chats.md` y `tests/e2e/us27-gestion-chats.sh`

---

## Phase 2: Foundational

**Purpose**: Persistencia y servicios compartidos que bloquean las historias.

- [x] T003 Agregar estado de bloqueo e historial de reportes tenant-first en `src/lib/db/schema.ts`
- [x] T004 Generar y revisar la migración correspondiente en `drizzle/0017_*.sql` y `drizzle/meta/`
- [x] T005 [P] Escribir pruebas fallidas de validación, bloqueo y reporte en `tests/unit/chat-moderation.test.ts`
- [x] T006 Implementar el adaptador oficial de usuarios bloqueados en `src/server/whatsapp/blocked-users.ts`
- [x] T007 Implementar operaciones tenant-safe y publicación SSE en `src/server/inbox/moderation.ts`
- [x] T008 Extender DTOs y consultas sin N+1 en `src/lib/types.ts` y `src/server/inbox/queries.ts`

**Checkpoint**: Estado, contrato Meta y dominio de moderación listos.

---

## Phase 3: User Story 1 - Eliminar conversaciones (Priority: P1)

**Goal**: Eliminar uno o hasta 100 chats sin eliminar contactos ni prospectos.

**Independent Test**: Eliminar individual y masivamente, cancelar y comprobar
reingreso sin duplicar contacto/prospecto.

- [x] T009 [US1] Agregar DELETE individual y acción bulk validada en `src/app/api/conversations/[id]/route.ts` y `src/app/api/conversations/bulk/route.ts`
- [x] T010 [US1] Añadir selección visible, contador, acción individual y confirmación de eliminación en `src/components/inbox/conversation-list.tsx`, `src/components/inbox/inbox-client.tsx` y `src/components/inbox/conversation-actions-dialogs.tsx`
- [x] T011 [US1] Ejecutar los casos de eliminación y reingreso en `tests/e2e/us27-gestion-chats.sh`

**Checkpoint**: Eliminación acotada y recuperable por nuevo ingreso.

---

## Phase 4: User Story 2 - Bloquear y desbloquear (Priority: P1)

**Goal**: El bloqueo corta todo envío/IA, se sincroniza con Meta y degrada
fail-closed.

**Independent Test**: Bloquear, intentar cada camino de salida, fallar Meta,
reintentar, fallar desbloqueo y desbloquear exitosamente.

- [x] T012 [US2] Aplicar guardia de bloqueo a texto/archivo en `src/server/inbox/send.ts` y plantillas en `src/server/whatsapp/templates.ts`
- [x] T013 [US2] Excluir bloqueados de campañas y seguimientos en `src/server/campaigns/audience.ts` y `src/server/ai/follow-up.ts`
- [x] T014 [US2] Cortar turnos y refrescos de IA para bloqueados en `src/server/ai/pipeline.ts`
- [x] T015 [US2] Extender el mock Graph para bloquear/desbloquear/listar y simular fallos en `src/app/api/dev/wa-mock/graph/[...path]/route.ts` y `src/server/dev/wa-mock-state.ts`
- [x] T016 [US2] Añadir acciones, indicadores, reintento y compositor bloqueado en `src/components/inbox/conversation-list.tsx`, `src/components/inbox/inbox-client.tsx` y `src/components/inbox/conversation-actions-dialogs.tsx`
- [x] T017 [US2] Ejecutar bloqueo local/remoto, todos los caminos de salida y fallos externos en `tests/e2e/us27-gestion-chats.sh`

**Checkpoint**: Un contacto bloqueado no puede recibir mensajes del CRM.

---

## Phase 5: User Story 3 - Reportar contactos (Priority: P2)

**Goal**: Registrar reportes internos individuales/masivos con auditoría.

**Independent Test**: Reportar uno y varios, comprobar razón/actor/fecha y que
no bloquea automáticamente.

- [x] T018 [US3] Añadir validación y persistencia append-only al endpoint bulk en `src/app/api/conversations/bulk/route.ts` y `src/server/inbox/moderation.ts`
- [x] T019 [US3] Añadir diálogo de motivo/notas, aclaración interna e indicador en `src/components/inbox/conversation-actions-dialogs.tsx`, `src/components/inbox/conversation-list.tsx` y `src/components/inbox/inbox-client.tsx`
- [x] T020 [US3] Ejecutar reportes, aislamiento y no-bloqueo en `tests/e2e/us27-gestion-chats.sh`

**Checkpoint**: Moderación auditable sin prometer integración inexistente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T021 Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm build` y `pnpm test` y corregir hasta verde
- [x] T022 [P] Ejecutar regresiones de Bandeja, IA, campañas, etapas y contactos con los guiones aplicables en `tests/e2e/`
- [x] T023 Validar visualmente con navegador real a 375, 768 y 1440 px, teclado, consola limpia y sin overflow según `specs/014-gestion-chats/quickstart.md`
- [x] T024 Actualizar resultados y marcar todas las tareas completadas en `specs/014-gestion-chats/plan.md` y `specs/014-gestion-chats/tasks.md`

---

## Dependencies & Execution Order

- Setup → Foundational → US1 y US2 → US3 → Polish.
- T003–T008 bloquean endpoints y UI.
- US1 y US2 comparten la selección, pero se pueden verificar por separado.
- US3 reutiliza el endpoint bulk y el diálogo, sin depender semánticamente del
  bloqueo.
- Las tareas `[P]` afectan archivos distintos o documentación/pruebas aisladas.

## Coverage

| Requirement | Tasks |
|---|---|
| FR-001–FR-005 | T007–T011 |
| FR-006–FR-010 | T003–T008, T012–T017 |
| FR-011–FR-013 | T003, T007–T008, T018–T020 |
| FR-014–FR-016 | T007–T011, T016–T020 |
| FR-017 | T021–T024 |
| SC-001–SC-006 | T011, T017, T020–T024 |

## Implementation Strategy

1. Persistir el estado en contacto y la auditoría en su propia tabla.
2. Centralizar operaciones y guardias servidoras antes de exponer UI.
3. Entregar eliminación y selección (US1).
4. Cerrar bloqueo real en todos los productores (US2).
5. Añadir reporte interno sobre la misma infraestructura (US3).
6. Iterar con E2E, gate completo, regresiones y revisión responsive.
