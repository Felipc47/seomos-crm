# Tasks: Bandera de país en la bandeja

**Input**: `spec.md` y `plan.md` de esta carpeta.

## Phase 1: Resolución local

- [x] T001 [US1] Añadir metadatos telefónicos locales y resolver el país al serializar conversaciones con fallback seguro, sin servicios externos.
- [x] T002 [US1] Cubrir países representativos, formatos tolerados y teléfonos inválidos en `tests/unit/phone-country.test.ts`.

## Phase 2: UI de bandeja

- [x] T003 [US1] Crear `src/components/inbox/inbox-contact-avatar.tsx` como wrapper compacto y accesible del avatar existente.
- [x] T004 [US1] Pasar el teléfono desde la fila, el encabezado y el panel de contacto en `src/components/inbox/`.

## Phase 3: Verificación

- [x] T005 [US1] Crear y ejecutar `tests/e2e/us33-banderas-pais-bandeja.sh` con camino válido e inválido.
- [x] T006 Ejecutar el detector de diseño sobre los archivos UI modificados y corregir hallazgos reales.
- [x] T007 Inspeccionar en navegador 375, 768 y 1440 px, claro/oscuro, sin errores de consola ni solapamientos.
- [x] T008 Ejecutar `pnpm typecheck && pnpm lint && pnpm build && pnpm test` y corregir hasta verde.
- [x] T009 Actualizar esta lista y el estado de la especificación con evidencia final.

## Dependencies & Execution Order

T001 → T002/T003 → T004 → T005–T008 → T009.
