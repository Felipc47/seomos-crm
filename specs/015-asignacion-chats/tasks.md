# Tasks: Asignación y transferencia de chats

**Input**: Documentos en `specs/015-asignacion-chats/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/http.md`, `quickstart.md`

**Tests**: La especificación y la constitución exigen unitarias, E2E con dos
sesiones, caminos infelices, gate técnico y verificación visual real.

## Phase 1: Setup

**Purpose**: Preparar contratos y prueba de comportamiento antes del código.

- [x] T001 Verificar rama, worktree, modelo de `lead`, sesión, equipo, DTOs, rutas de Bandeja, SSE y notificaciones en `src/` y `tests/`
- [x] T002 [P] Crear el self-test inicialmente fallido en `tests/e2e/us28-asignacion-chats.md` y `tests/e2e/us28-asignacion-chats.sh`

---

## Phase 2: Foundational

**Purpose**: Contratos compartidos por filtro, transferencia y tiempo real.

- [x] T003 [P] Añadir DTOs de miembros asignables y pruebas de validación/idempotencia en `src/lib/types.ts` y `tests/unit/inbox-assignment.test.ts`
- [x] T004 Implementar resolución tenant-safe del miembro actual y destinos válidos en `src/server/inbox/assignment.ts`

**Checkpoint**: Identidad del miembro y opciones de la empresa disponibles sin
inferencias por nombre/correo.

---

## Phase 3: User Story 1 - Ver mis conversaciones (Priority: P1)

**Goal**: Filtrar Bandeja por el responsable de la sesión y combinarlo con los
filtros existentes.

**Independent Test**: Con chats propios, ajenos y sin asignar, activar
“Asignados a mí” y comprobar composición con búsqueda, etapa, no leídos y
archivados.

- [x] T005 [US1] Exponer `GET /api/conversations/assignment-options` en `src/app/api/conversations/assignment-options/route.ts`
- [x] T006 [US1] Añadir selector “Todos / Asignados a mí / Sin asignar”, estado vacío y limpieza de selección oculta en `src/components/inbox/conversation-list.tsx`
- [x] T007 [US1] Cargar opciones y miembro actual en `src/components/inbox/inbox-client.tsx`
- [x] T008 [US1] Ejecutar filtro propio, composición y vacíos en `tests/e2e/us28-asignacion-chats.sh`

**Checkpoint**: Cada miembro puede alternar su cola personal sin cambiar permisos.

---

## Phase 4: User Story 2 - Transferir un chat (Priority: P1)

**Goal**: Cambiar responsable o desasignar sin alterar el hilo ni su contexto.

**Independent Test**: Transferir un chat con varios mensajes/archivo y comprobar
el mismo chat, historial exacto y rechazo de recursos ajenos.

- [x] T009 [US2] Implementar transferencia idempotente, creación mínima de prospecto y serialización tenant-safe en `src/server/inbox/assignment.ts`
- [x] T010 [US2] Exponer `PATCH /api/conversations/[id]/assignee` con Zod y errores tipados en `src/app/api/conversations/[id]/assignee/route.ts`
- [x] T011 [P] [US2] Crear diálogo accesible de transferencia y “Sin asignar” en `src/components/inbox/conversation-transfer-dialog.tsx`
- [x] T012 [US2] Añadir “Transferir chat” al menú de fila y encabezado y conectar mutación/toasts en `src/components/inbox/conversation-list.tsx` y `src/components/inbox/inbox-client.tsx`
- [x] T013 [US2] Ejecutar conservación exacta, desasignación, idempotencia, chat sin prospecto y aislamiento tenant en `tests/e2e/us28-asignacion-chats.sh`

**Checkpoint**: La responsabilidad cambia y la conversación conserva toda su identidad.

---

## Phase 5: User Story 3 - Recibir y reflejar la transferencia (Priority: P2)

**Goal**: Notificar al destino y converger en tiempo real en ambas sesiones.

**Independent Test**: Dos sesiones abiertas con filtro personal; transferir y
observar salida/entrada del chat más notificación enlazada sin recargar.

- [x] T014 [US3] Publicar `conversation.updated` y crear notificación best-effort solo para transferencias efectivas en `src/server/inbox/assignment.ts`
- [x] T015 [US3] Actualizar listas, insignias y filtro personal mediante respuesta local + SSE en `src/components/inbox/inbox-client.tsx`
- [x] T016 [US3] Ejecutar dos sesiones, alerta enlazada y SSE en `tests/e2e/us28-asignacion-chats.sh`, más fallo secundario sin rollback en `tests/unit/inbox-assignment.test.ts`

**Checkpoint**: Emisor y receptor ven el estado correcto sin refresco manual.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T017 Completar pruebas unitarias de esquema, destino, idempotencia y notificación en `tests/unit/inbox-assignment.test.ts`, más destinos/roles reales en el E2E
- [x] T018 Validar teclado, consola limpia y responsive a 375, 768 y 1440 px según `specs/015-asignacion-chats/quickstart.md`
- [x] T019 Ejecutar regresiones de Bandeja, gestión de chats, servicios/equipo e IA con los guiones aplicables de `tests/e2e/`
- [x] T020 Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm build` y `pnpm test` y corregir hasta verde
- [x] T021 Actualizar resultados y marcar tareas completas en `specs/015-asignacion-chats/plan.md` y `specs/015-asignacion-chats/tasks.md`

---

## Dependencies & Execution Order

- Setup → Foundational → US1 y US2 → US3 → Polish.
- T003–T004 bloquean identificación, endpoint y diálogo.
- US1 puede verificarse con asignaciones creadas por servicio, sin depender de la
  mutación de US2.
- US2 reutiliza las opciones de T004, pero conserva valor independiente aunque
  el filtro esté en “Todos”.
- US3 depende de la transferencia efectiva de US2.
- Las tareas `[P]` afectan archivos independientes en ese momento del flujo.

## Coverage

| Requirement | Tasks |
|---|---|
| FR-001–FR-004 | T003–T008 |
| FR-005–FR-011 | T003–T004, T009–T013 |
| FR-012–FR-014 | T014–T016 |
| FR-015–FR-017 | T012–T021 |
| SC-001–SC-006 | T008, T013, T016–T021 |

## Parallel Example

```text
T002: crear self-test E2E
T003: definir DTOs y unitarias

Después de T010:
T011: construir diálogo aislado
T013: ampliar casos API/historial del E2E
```

## Implementation Strategy

1. Resolver identidad y opciones tenant-safe.
2. Entregar primero el filtro personal (US1) sobre asignaciones existentes.
3. Implementar transferencia con invariantes de historial (US2).
4. Añadir notificación y convergencia de dos sesiones (US3).
5. Iterar con E2E, responsive, regresiones y gate completo.
