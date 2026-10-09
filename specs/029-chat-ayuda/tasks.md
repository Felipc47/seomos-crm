# Tasks: Chat de ayuda

## Setup y cimientos
- [x] T001 Crear spec y plan de la feature en `specs/029-chat-ayuda/`.
- [x] T002 Crear catálogo de guías y filtro por permisos en `src/lib/help-guides.ts`.

## US1 — Dudas y navegación
- [x] T003 [US1] Implementar respuesta fundamentada y enlaces por IDs en `src/server/ai/help-assistant.ts`.
- [x] T004 [US1] Implementar chat accesible/contextual y montarlo en `src/components/help/help-chat.tsx` y `src/app/(app)/layout.tsx`.

## US2 — Acceso y privacidad
- [x] T005 [US2] Implementar endpoint autenticado, validación y límite por sesión en `src/app/api/help/chat/route.ts`.
- [x] T006 [US2] Verificar catálogo y aislamiento con `tests/unit/help-assistant.test.ts` y `tests/e2e/us38-help-chat.mjs`.

## US3 — Degradación y recuperación
- [x] T007 [US3] Añadir respuesta de mock y escenarios inválidos en `src/server/dev/ai-mock.ts`.
- [x] T008 [US3] Probar proveedor fallido, formato inesperado, red fallida y reintento en `tests/unit/help-assistant.test.ts` y `tests/e2e/us38-help-chat.mjs`.

## Calidad
- [x] T009 Correr typecheck, lint, build y tests; guardar resultados en `specs/029-chat-ayuda/quickstart.md`.
- [x] T010 Ejecutar E2E y revisar capturas desktop/móvil en `.artifacts/us38-help-chat/`; actualizar estos artefactos.

## Dependencias y estrategia
T001→T002→T003/T005→T004→T007→T006/T008→T009→T010. MVP: US1; entrega completa añade US2/US3. Trabajo secuencial en esta sesión; pruebas unitarias y preparación de guion pueden escribirse independientemente tras cerrar el contrato.

## Resultado 2026-10-09
Gate final verde: 49 archivos / 341 pruebas unitarias. E2E: 65 comprobaciones verdes, repetido tras ajustar textos y foco. QA adicional del tema oscuro con respuesta del mock. Producción no desplegada. Cambios previos ajenos preservados.
