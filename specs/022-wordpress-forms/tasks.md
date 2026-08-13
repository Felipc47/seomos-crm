# Tasks: Integración de formularios WordPress

**Input**: Design documents from `specs/022-wordpress-forms/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/http.md`, `quickstart.md`

**Tests**: La constitución y la spec exigen unitarias, contrato, E2E con mocks, caminos infelices, gate completo y verificación visual.

## Phase 1: Setup

**Purpose**: Confirmar la base existente y fijar una prueba observable antes de implementar.

- [x] T001 Verificar rama, cambios locales ajenos, esquema actual, helpers de ingesta y harness de self-test en `src/server/inbox/`, `drizzle/` y `tests/e2e/`
- [x] T002 [P] Escribir el guion y criterios de comportamiento para JSON, form-urlencoded, idempotencia, aislamiento, consentimiento, rotación y fallos en `tests/e2e/us32-wordpress-forms.md` y `tests/e2e/us32-wordpress-forms.sh`

---

## Phase 2: Foundational

**Purpose**: Persistencia, DTOs y primitivas seguras que bloquean todas las historias.

- [x] T003 Agregar `web_form_integration`, `web_form_submission` y `contact.consent_source=web_form` en `src/lib/db/schema.ts`
- [x] T004 Agregar prefijos de IDs y DTOs compartidos de integraciones en `src/lib/db/ids.ts` y `src/lib/types.ts`
- [x] T005 Generar y revisar la migración org-first e idempotente en `drizzle/0024_*.sql` y `drizzle/meta/`
- [x] T006 [P] Escribir pruebas fallidas de contrato, aliases, teléfono, booleanos, secreto y limitación en `tests/unit/web-form-contract.test.ts`
- [x] T007 Implementar parsing/normalización allowlist y errores tipados en `src/server/web-forms/contract.ts`
- [x] T008 Implementar generación, cifrado, comparación constante y DTO seguro del secreto en `src/server/web-forms/credentials.ts`
- [x] T009 Implementar limitador acotado por integración/IP sin persistir datos sensibles en `src/server/web-forms/rate-limit.ts`

**Checkpoint**: El contrato público y el ledger tenant-safe están listos para ser consumidos.

---

## Phase 3: User Story 1 - Recibir un prospecto desde WordPress (Priority: P1) 🎯 MVP

**Goal**: Un webhook válido crea o actualiza una sola oportunidad observable en todas las superficies.

**Independent Test**: Enviar JSON y form-urlencoded con un ID nuevo/duplicado y comprobar un contacto, conversación, lead y ledger, sin cruzar empresa.

- [x] T010 [US1] Escribir pruebas de dominio para nota sanitizada y conservación, más reserva concurrente/recuperación en `tests/unit/web-form-ingest.test.ts` y `tests/e2e/us32-wordpress-forms.sh`
- [x] T011 [US1] Implementar reserva/reintento idempotente, contacto, nota sanitizada, conversación y lead en `src/server/web-forms/ingest.ts`
- [x] T012 [US1] Implementar autenticación pública, body limit, content-types y respuestas del contrato en `src/app/api/integrations/forms/[integrationId]/submissions/route.ts`
- [x] T013 [US1] Actualizar serialización y etiquetas de fuente de contacto para `web_form` en `src/server/contacts.ts`, `src/lib/types.ts` y `src/components/contacts/contacts-client.tsx`
- [x] T014 [US1] Ejecutar el bloque de ingreso, formatos, duplicados, concurrencia y aislamiento de `tests/e2e/us32-wordpress-forms.sh` hasta verde

**Checkpoint**: La sincronización entrante funciona como MVP independiente.

---

## Phase 4: User Story 2 - Desencadenar la lógica comercial (Priority: P1)

**Goal**: El formulario aplica servicio, avisos, consentimiento y saludo sin bloquearse ni repetir efectos.

**Independent Test**: Ingresar leads con/sin consentimiento y con fallos simulados, verificando servicio/avisos y como máximo un saludo.

- [x] T015 [US2] Extraer un resultado de creación de lead reusable que permita diferir avisos sin cambiar callsites existentes en `src/server/inbox/lead-activity.ts`
- [x] T016 [US2] Aplicar servicio tenant-safe sin pisar atribución histórica y registrar consentimiento explícito en `src/server/web-forms/ingest.ts`
- [x] T017 [US2] Programar email, saludo marcado antes del intento y publicación SSE tolerantes a fallos en `src/server/web-forms/ingest.ts` y la ruta pública
- [x] T018 [US2] Añadir unitarias para elegibilidad de saludo, bloqueo/baja, atribución preservada y errores sanitizados en `tests/unit/web-form-ingest.test.ts`
- [x] T019 [US2] Ejecutar consentimiento, plantilla, WhatsApp/Resend fallidos, SSE y deduplicación de efectos en `tests/e2e/us32-wordpress-forms.sh` hasta verde

**Checkpoint**: El canal web comparte la lógica comercial sin acoplar la respuesta a proveedores.

---

## Phase 5: User Story 3 - Configurar y diagnosticar la conexión (Priority: P2)

**Goal**: El administrador gestiona integraciones y secretos desde Ajustes; ningún otro rol o tenant accede.

**Independent Test**: Crear, listar, editar, desactivar y rotar en dos empresas; comprobar revelado único y permisos.

- [x] T020 [P] [US3] Implementar listado/creación admin tenant-safe en `src/app/api/settings/web-forms/route.ts`
- [x] T021 [P] [US3] Implementar edición y rotación admin tenant-safe en `src/app/api/settings/web-forms/[id]/route.ts` y `src/app/api/settings/web-forms/[id]/rotate/route.ts`
- [x] T022 [US3] Crear la pantalla de Integraciones y navegación de Ajustes en `src/app/(app)/settings/integrations/page.tsx`, `src/components/settings/web-forms-client.tsx` y `src/components/settings/settings-nav.tsx`
- [x] T023 [US3] Implementar revelado único, copia, confirmación de rotación/estado y diagnósticos accesibles en `src/components/settings/web-forms-client.tsx`
- [x] T024 [US3] Ejecutar CRUD, roles, otro tenant, secreto rotado/desactivado y persistencia de datos en `tests/e2e/us32-wordpress-forms.sh` hasta verde

**Checkpoint**: Cada empresa puede operar y revocar su conexión sin asistencia de código.

---

## Phase 6: User Story 4 - Conectar formularios comunes (Priority: P3)

**Goal**: La pantalla entrega un contrato y recetas concretas para constructores WordPress comunes.

**Independent Test**: Seguir los ejemplos mostrados para construir payloads equivalentes y obtener el mismo resultado.

- [x] T025 [US4] Añadir contrato, `curl`, aliases y recetas para Contact Form 7, Elementor Forms, WPForms y webhook propio en `src/components/settings/web-forms-client.tsx`
- [x] T026 [US4] Añadir casos automatizados de todos los aliases y payloads documentados en `tests/unit/web-form-contract.test.ts` y `tests/e2e/us32-wordpress-forms.sh`

**Checkpoint**: Los constructores soportados se conectan contra una única frontera estable.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T027 Ejecutar `pnpm typecheck && pnpm lint && pnpm build && pnpm test` y corregir hasta verde
- [x] T028 Ejecutar `tests/e2e/us32-wordpress-forms.sh` y regresiones de leadgen, consentimiento, servicios, asignación, correo y Bandeja hasta verde
- [x] T029 Validar en navegador real a 375, 768 y 1440 px el flujo de configuración, copia, errores, nuevo lead y SSE, con consola limpia y sin overflow
- [x] T030 Revisar diff por secretos/payloads, actualizar resultados en `specs/022-wordpress-forms/plan.md` y marcar todas las tareas completas en `specs/022-wordpress-forms/tasks.md`
- [x] T031 Persistir en `memory/` cualquier gotcha nuevo de idempotencia o self-test que no esté documentado en el código o la spec

---

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2 → US3 → US4 → Polish.
- T003–T009 bloquean la ruta pública y APIs internas.
- US1 entrega el MVP de sincronización; US2 extiende efectos sobre el mismo ledger.
- US3 depende del modelo/credenciales, pero su contrato puede prepararse en paralelo con US1 tras Foundational.
- US4 depende de que contrato y UI estén estables.
- T027–T031 se ejecutan después de todas las historias.

## Parallel Opportunities

- T002 y la inspección T001 afectan archivos distintos.
- T006 puede escribirse mientras se prepara esquema/IDs T003–T005.
- T020 y T021 son rutas distintas una vez establecidas las credenciales.
- Las unitarias de contrato y los casos E2E pueden ampliarse sin tocar archivos de dominio.

## Coverage

| Requirement | Tasks |
|---|---|
| FR-001–FR-002, FR-013–FR-015 | T003–T009, T020–T024 |
| FR-003–FR-005, FR-016, FR-019–FR-020 | T006–T014, T026–T030 |
| FR-006–FR-008, FR-012 | T010–T019 |
| FR-009–FR-011 | T015–T019 |
| FR-017 | T025–T026 |
| FR-018 | T003–T005, T010–T012, T020–T024 |
| SC-001–SC-007 | T014, T019, T024, T026–T030 |

## Implementation Strategy

1. Cerrar ledger y contrato antes de aceptar tráfico.
2. Entregar la ingesta durable como MVP y verificarla de forma independiente.
3. Añadir efectos comerciales post-persistencia con pruebas de fallo.
4. Exponer administración y guías sobre la frontera ya estable.
5. Cerrar con gate, regresiones, navegador real, seguridad y memoria.
