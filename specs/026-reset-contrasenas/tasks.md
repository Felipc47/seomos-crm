# Tasks: Restablecimiento seguro de contraseñas

**Input**: Design documents from `/specs/026-reset-contrasenas/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/password-reset.md](contracts/password-reset.md)

**Tests**: Obligatorios por la constitución y por los criterios de seguridad de la especificación. Se escriben antes de su implementación correspondiente.

## Phase 1: Setup

**Purpose**: Alinear configuración y documentación operativa con la enmienda aprobada.

- [x] T001 Actualizar el alcance de correo transaccional en `.env.example` y `src/lib/env.ts` para incluir restablecimiento de contraseñas

---

## Phase 2: Foundational — tokens y entrega segura

**Purpose**: Activar la infraestructura compartida que bloquea ambos flujos P1.

- [x] T002 [P] Crear pruebas unitarias fallidas para contenido escapado, clave idempotente sin token y degradación en `tests/unit/password-reset.test.ts`
- [x] T003 Implementar composición y entrega sanitizada mediante Resend en `src/server/email/password-reset.ts`
- [x] T004 Configurar Better Auth con expiración, revocación de sesiones, rate limit y contexto interno de error en `src/lib/auth/index.ts`

**Checkpoint**: Better Auth puede generar, entregar y consumir tokens sin exponer secretos.

---

## Phase 3: User Story 1 — Recuperar la propia cuenta (Priority: P1) 🎯 MVP

**Goal**: Solicitar desde el login, abrir el enlace, cambiar la contraseña y revocar credenciales anteriores.

**Independent Test**: Un admin completa todo el flujo en navegador; la clave vieja y sesión previa fallan, la nueva entra y el enlace no puede reutilizarse.

- [x] T005 [US1] Escribir primero el recorrido E2E de recuperación propia, anti-enumeración y límite público de solicitudes en `tests/e2e/us34-password-reset.sh`
- [x] T006 [P] [US1] Crear la pantalla pública de solicitud neutra en `src/app/(auth)/forgot-password/page.tsx`
- [x] T007 [US1] Crear formulario y página de nueva contraseña con token inválido, confirmación y éxito en `src/components/auth/reset-password-form.tsx` y `src/app/(auth)/reset-password/page.tsx`
- [x] T008 [US1] Añadir el acceso visible “Olvidé mi contraseña” en `src/app/(auth)/login/page.tsx`

**Checkpoint**: US1 funciona independientemente sin una sesión activa.

---

## Phase 4: User Story 2 — Ayudar a un integrante (Priority: P1)

**Goal**: Un admin inicia el proceso para una persona de su tenant sin ver token ni contraseña.

**Independent Test**: El admin usa la pantalla de equipo; el miembro cambia su clave, mientras un no-admin y un admin con ID ajeno son rechazados sin entrega.

- [x] T009 [US2] Extender primero el E2E con acción admin, rol prohibido y cruce de organización en `tests/e2e/us34-password-reset.sh`
- [x] T010 [US2] Implementar el endpoint admin rate-limited y org-scoped en `src/app/api/settings/team/[memberId]/password-reset/route.ts`
- [x] T011 [US2] Añadir acción, carga, éxito y error responsivos por miembro en `src/components/settings/team-client.tsx`

**Checkpoint**: US2 funciona para miembros del tenant y no amplía privilegios.

---

## Phase 5: User Story 3 — Degradar de forma segura (Priority: P2)

**Goal**: Fallos del proveedor y tokens inválidos terminan de forma segura, sin falsa entrega admin ni cambio de credenciales.

**Independent Test**: El mock devuelve 500; la UI admin muestra indisponibilidad, la pública conserva respuesta neutra y las contraseñas siguen funcionando.

- [x] T012 [US3] Extender primero el E2E con fallo Resend menor de 10 segundos, token alterado/reutilizado y ausencia de secretos en respuestas en `tests/e2e/us34-password-reset.sh`
- [x] T013 [US3] Ajustar la degradación pública/admin y los mensajes sanitizados en `src/server/email/password-reset.ts`, `src/lib/auth/index.ts` y `src/components/settings/team-client.tsx`
- [x] T014 [US3] Documentar el escenario y evidencias esperadas en `tests/e2e/us34-password-reset.md`

**Checkpoint**: El camino infeliz conserva disponibilidad, privacidad y credenciales.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T015 Verificar trazabilidad FR-001 a FR-015 y actualizar `specs/026-reset-contrasenas/quickstart.md` si el comportamiento final difiere
- [x] T016 Ejecutar `pnpm typecheck && pnpm lint && pnpm build && pnpm test` y corregir hasta verde
- [x] T017 Ejecutar `bash tests/e2e/us34-password-reset.sh` contra la UI real y corregir camino feliz e infeliz hasta verde

---

## Dependencies & Execution Order

- T001 puede ejecutarse de inmediato.
- T002 debe preceder T003 y T004; T003 precede T004.
- US1 depende de T004; T005 se escribe antes de T006–T008.
- US2 depende de T004; T009 se escribe antes de T010–T011 y puede implementarse después de US1.
- US3 depende de US1 y US2 para ejercer ambas semánticas; T012 precede T013–T014.
- T015–T017 dependen de todas las historias.

## Parallel Opportunities

- T002 y T001 afectan archivos distintos y pueden ejecutarse en paralelo.
- Tras T005, T006 puede prepararse en paralelo con la estructura inicial de T007 porque son archivos distintos.
- La documentación T014 puede redactarse mientras se revisan los resultados de T012, sin modificar código de aplicación.

## Implementation Strategy

1. Activar la entrega/tokens con pruebas unitarias.
2. Completar y verificar US1 como MVP recuperable desde el login.
3. Reutilizar el mismo flujo bajo autorización tenant para US2.
4. Forzar fallos y reusos para cerrar US3.
5. Ejecutar gate técnico y recorrido Playwright completo sin delegar pruebas al usuario.
