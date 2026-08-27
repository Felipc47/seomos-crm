# Tasks: Asistente de configuración del agente

**Input**: Design documents from `/specs/027-asistente-configuracion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup y contratos

- [x] T001 [P] Documentar producto y feature en `PRODUCT.md` y `specs/027-asistente-configuracion/`
- [x] T002 [P] Añadir pruebas unitarias iniciales del lector seguro y del contrato de borrador en `tests/unit/agent-config-assistant.test.ts`

## Phase 2: Fundación segura

- [x] T003 [US1] Implementar validación de destinos, lectura acotada, redirecciones manuales y extracción de texto en `src/server/ai/website-reader.ts`
- [x] T004 [US1] Implementar esquema y generación robusta del borrador en `src/server/ai/config-assistant.ts`
- [x] T005 [US1] Exponer ruta autenticada y autorizada en `src/app/api/agent/config-assistant/route.ts`
- [x] T006 [US1] Extender el mock determinista en `src/server/dev/ai-mock.ts`

## Phase 3: User Story 1 — sitio web y revisión

- [x] T007 [US1] Construir el slide-over accesible de preguntas, carga y preview en `src/components/agent/agent-setup-assistant.tsx`
- [x] T008 [US1] Integrar el acceso destacado y la aplicación local del borrador en `src/components/agent/agent-client.tsx`

## Phase 4: User Story 2 — sin sitio web

- [x] T009 [US2] Validar la ruta alternativa por descripción y conservar las mismas salidas en servidor y UI

## Phase 5: User Story 3 — degradación segura

- [x] T010 [US3] Cubrir errores de URL, lectura y proveedor con mensajes accionables, reintento y conservación del formulario
- [x] T011 [US3] Crear self-test de comportamiento feliz/infeliz en `tests/e2e/us32-agent-config-assistant.mjs` y documentarlo en `tests/e2e/us32-agent-config-assistant.md`

## Phase 6: Calidad y cierre

- [x] T012 Ejecutar `pnpm typecheck && pnpm lint && pnpm build && pnpm test`
- [x] T013 Ejecutar el E2E local, capturar escritorio/móvil y verificar persistencia explícita
- [x] T014 Ejecutar detector/revisión visual final y actualizar el estado durable de estas tareas

## Dependencies & Execution Order

- T001 y T002 preparan el contrato; T003–T006 implementan la fundación.
- T007 depende de T004/T005; T008 depende de T007.
- T009 y T010 completan los caminos alternos sobre la misma UI/API.
- T011 depende de T006–T010; T012–T014 cierran la feature.
