# Tasks: Audio interoperable y previsualización de imágenes

**Input**: `specs/007-audio-imagen/spec.md`, `plan.md`.

## Phase 1: MIME de las notas de voz

**Goal**: enviar a Meta solo formatos de audio compatibles y canónicos.

- [x] T001 [US1] Añadir normalización de MIME permitido y sus pruebas en `src/lib/wa-media.ts` y `tests/unit/wa-media.test.ts`.
- [x] T002 [US1] Priorizar AAC/MP4 y conservar OGG/Opus como alternativa de `MediaRecorder` en `src/components/inbox/composer.tsx`.
- [x] T003 [US1] Usar el MIME canónico al subir y persistir adjuntos en `src/server/inbox/send.ts`.
- [x] T004 [US1] Ejercer un audio con MIME parametrizado y su round-trip en `tests/e2e/us16-adjuntos.sh`.

## Phase 2: Imágenes visibles por defecto

**Goal**: evitar la descarga manual para ver imágenes disponibles.

- [x] T005 [US2] Mostrar imágenes y stickers automáticamente, con degradación en error, en `src/components/inbox/message-thread.tsx`.
- [x] T006 [US2] Actualizar el contrato observable en `tests/e2e/us15-reproducir-media.md`.

## Phase 3: Verificación

- [x] T007 Ejecutar pruebas unitarias, `tests/e2e/us16-adjuntos.sh`, `tests/e2e/us15-reproducir-media.sh` y `tests/e2e/us35-media-ui.mjs`.
- [x] T008 Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm build` y `pnpm test`.

## Dependencies & Execution Order

T001 precede T003 y T004. T002 y T005 no comparten archivos y pueden hacerse
en paralelo. T007 y T008 cierran ambas historias.
