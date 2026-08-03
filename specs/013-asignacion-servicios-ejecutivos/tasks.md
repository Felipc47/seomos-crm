# Tasks: Asignación de servicios a ejecutivos comerciales

**Input**: Documentos en `specs/013-asignacion-servicios-ejecutivos/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/http.md`, `quickstart.md`

**Tests**: La constitución y la especificación exigen unitarias, E2E con mocks,
casos infelices, gate técnico y verificación visual real.

## Phase 1: Setup

**Purpose**: Confirmar contexto y preparar el escenario verificable.

- [x] T001 Verificar rama, worktree, migraciones existentes y scripts de prueba en `drizzle/`, `tests/unit/` y `tests/e2e/`
- [x] T002 [P] Crear el guion de comportamiento y criterios automatizables en `tests/e2e/us26-asignacion-servicios.md` y `tests/e2e/us26-asignacion-servicios.sh`

---

## Phase 2: Foundational

**Purpose**: Persistencia y reglas compartidas que bloquean todas las historias.

- [x] T003 Agregar responsable vigente al servicio y atribución copiada al lead en `src/lib/db/schema.ts`
- [x] T004 Generar y revisar la migración org-first correspondiente en `drizzle/0016_*.sql` y `drizzle/meta/`
- [x] T005 [P] Escribir pruebas fallidas de elegibilidad y normalización en `tests/unit/service-assignment.test.ts`
- [x] T006 Implementar la regla de elegibilidad comercial reutilizable en `src/server/services/assignment.ts`

**Checkpoint**: Esquema y regla multi-tenant listos para configurar y enrutar.

---

## Phase 3: User Story 1 - Configurar responsables por servicio (Priority: P1)

**Goal**: El admin asigna un ejecutivo por servicio y reconoce la distribución
desde Servicios y Equipo.

**Independent Test**: Crear dos ejecutivos y dos servicios, guardar
asignaciones, recargar y comprobar resumen; un comercial recibe 403.

- [x] T007 [US1] Ampliar GET/PATCH de servicios con ejecutivos elegibles, validación tenant/rol y permiso admin en `src/app/api/services/route.ts` y `src/app/api/services/[id]/route.ts`
- [x] T008 [US1] Liberar servicios al cambiar un miembro fuera del rol comercial y exponer sus servicios en `src/app/api/settings/team/route.ts` y `src/app/api/settings/team/[memberId]/route.ts`
- [x] T009 [US1] Añadir selector de responsable, estados busy/error y estado sin asignar en `src/components/settings/services-client.tsx` y `src/app/(app)/services/page.tsx`
- [x] T010 [US1] Mostrar el resumen de servicios por ejecutivo en `src/components/settings/team-client.tsx`
- [x] T011 [US1] Ejecutar el bloque US1 de `tests/e2e/us26-asignacion-servicios.sh` y corregir permisos, recarga y responsive hasta verde

**Checkpoint**: La distribución futura queda completamente configurable.

---

## Phase 4: User Story 2 - Enrutar automáticamente nuevos prospectos (Priority: P1)

**Goal**: Cada evento nuevo copia servicio y responsable al prospecto y
notifica una sola vez al ejecutivo.

**Independent Test**: Ingresar leadgen de servicio asignado, no asignado y
duplicado; verificar estado y notificaciones.

- [x] T012 [US2] Hacer que la actividad de lead devuelva el prospecto creado o existente en `src/server/inbox/lead-activity.ts`
- [x] T013 [US2] Resolver y persistir servicio/responsable vigente durante leadgen en `src/server/leadgen/ingest.ts`
- [x] T014 [US2] Crear notificación navegable tolerante a fallos después de persistir la asignación en `src/server/leadgen/ingest.ts` y `src/server/notifications.ts`
- [x] T015 [US2] Ejecutar casos asignado, sin responsable, miembro no elegible, evento duplicado y fallo de aviso en `tests/e2e/us26-asignacion-servicios.sh`

**Checkpoint**: La regla configurada produce un resultado operativo e
idempotente.

---

## Phase 5: User Story 3 - Reconocer responsable en la operación diaria (Priority: P2)

**Goal**: Servicio y asesor son consistentes en Bandeja, Pipeline, Contactos y
ficha.

**Independent Test**: El mismo prospecto muestra el mismo resumen en las tres
superficies y “Sin asignar” cuando corresponda.

- [x] T016 [P] [US3] Definir el DTO común de servicio y responsable en `src/lib/types.ts`
- [x] T017 [US3] Incorporar joins tenant-safe y respuestas consistentes en `src/app/api/pipeline/board/route.ts`, `src/app/api/contacts/route.ts`, `src/app/api/contacts/[id]/route.ts` y `src/server/inbox/queries.ts`
- [x] T018 [US3] Mostrar indicadores compactos en `src/components/pipeline/pipeline-client.tsx`, `src/components/contacts/contacts-client.tsx`, `src/components/inbox/conversation-list.tsx` y `src/components/inbox/contact-panel.tsx`
- [x] T019 [US3] Verificar consistencia y navegación de notificación con `tests/e2e/us26-asignacion-servicios.sh`

**Checkpoint**: El equipo reconoce inmediatamente propiedad y servicio.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T020 Ejecutar `pnpm typecheck && pnpm lint && pnpm build && pnpm test` y corregir hasta verde
- [x] T021 [P] Ejecutar regresiones de servicios, leadgen y edición unificada con los guiones aplicables en `tests/e2e/`
- [x] T022 Validar visualmente con navegador real a 375, 768 y 1440 px, consola limpia y sin overflow según `specs/013-asignacion-servicios-ejecutivos/quickstart.md`
- [x] T023 Actualizar resultados y marcar todas las tareas completadas en `specs/013-asignacion-servicios-ejecutivos/plan.md` y `specs/013-asignacion-servicios-ejecutivos/tasks.md`

---

## Dependencies & Execution Order

- Setup → Foundational → US1 y US2 → US3 → Polish.
- T003–T006 bloquean APIs, ingesta y joins.
- US1 configura la regla; US2 la consume. Sus pruebas de contrato pueden
  prepararse en paralelo, pero la verificación integrada ocurre después de
  ambas.
- US3 depende de que las columnas y DTOs de atribución existan.
- Las tareas `[P]` afectan archivos distintos y pueden ejecutarse en paralelo.

## Coverage

| Requirement | Tasks |
|---|---|
| FR-001–FR-006 | T003–T011 |
| FR-007–FR-010, FR-014 | T012–T015 |
| FR-011 | T016–T019 |
| FR-012–FR-013 | T003, T008, T013, T015 |
| FR-015 | T020–T023 |
| SC-001–SC-006 | T011, T015, T019–T023 |

---

## Phase 7: Conversaciones directas — extensión 2026-08-02

- [x] T024 Actualizar spec y diseño con precedencia Lead Ads/manual, allowlist
  tenant-safe, idempotencia y degradación ambigua.
- [x] T025 [P] Extender el prompt principal con el catálogo para que el agente
  haga preguntas de calificación cuando el servicio aún no sea evidente.
- [x] T026 Extender la pasada de ficha para devolver `serviceId` en la misma
  llamada y resolverlo únicamente contra servicios de la organización.
- [x] T027 Persistir servicio/responsable sin pisar Lead Ads ni transferencias,
  publicar SSE y notificar una sola vez con fallo tolerante.
- [x] T028 [P] Añadir unitarias para normalización/allowlist y adaptar el
  proveedor IA mock a clasificación determinista e inválida.
- [x] T029 Añadir E2E de WhatsApp directo: asignado, ambiguo→reintento,
  transferencia preservada, notificación idempotente y regresión Lead Ads.
- [x] T030 Ejecutar gate técnico completo y regresiones de IA, servicios,
  gestión/asignación de chats; documentar resultados.

| Requirement | Tasks |
|---|---|
| FR-016–FR-017 | T025–T026, T028 |
| FR-018–FR-020 | T027–T030 |
| SC-007–SC-008 | T029–T030 |

## Implementation Strategy

1. Persistir la regla y la copia histórica.
2. Entregar primero la configuración administrable (US1).
3. Conectar el ingreso idempotente y la alerta (US2).
4. Propagar un DTO común a las vistas operativas (US3).
5. Cerrar con E2E, gate completo, regresión y revisión responsive.
