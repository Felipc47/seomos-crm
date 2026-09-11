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

## Phase 4: Corrección de contenedor MP4 tras verificación real

- [x] T009 [US1] Reproducir la captura de Chromium con y sin `timeslice` y
  comprobar el contenedor con `ffprobe`.
- [x] T010 [US1] Generar un único fragmento final en
  `src/components/inbox/composer.tsx` para conservar la duración completa.
- [x] T011 Repetir gate, self-test de navegador, despliegue y smoke canónico.

## Phase 5: Normalización de nota de voz para Meta

- [x] T012 [US1] Marcar el audio del composer como nota de voz en el multipart.
- [x] T013 [US1] Convertir notas de voz a OGG/Opus con FFmpeg local, límites de
  tiempo/tamaño y limpieza garantizada de temporales.
- [x] T014 [US1] Enviar `audio.voice=true` y persistir el MIME transformado.
- [x] T015 [US1] Instalar FFmpeg únicamente en la imagen runtime.
- [x] T016 Verificar navegador → servidor → OGG/Opus → Meta mock, camino
  infeliz y gate completo.
- [x] T017 Desplegar, comprobar FFmpeg dentro del runtime y ejecutar smoke
  canónico.

## Phase 6: Reproducción real en el cliente móvil

- [x] T018 Registrar que una burbuja `delivered` puede seguir siendo
  irrecuperable y añadir reproducción a los criterios de aceptación.
- [x] T019 Declarar `audio/ogg; codecs=opus` en el archivo multipart conservando
  `audio/ogg` como tipo base de Media API.
- [ ] T020 Repetir E2E, gate técnico, despliegue y reproducción en WhatsApp real.

## Phase 7: Fallback a audio estándar tras fallo real de OGG/Opus

- [x] T021 Registrar la evidencia de producción: el binario OGG/Opus se
  reproduce desde el CRM, pero WhatsApp iOS lo declara no disponible.
- [x] T022 Normalizar las grabaciones a MP3 mono y omitir `audio.voice` en
  `src/server/whatsapp/voice-note.ts` y `src/server/inbox/send.ts`.
- [x] T023 Verificar navegador → servidor → MP3 → Meta mock, camino infeliz y
  gate completo.
- [ ] T024 Desplegar el commit exacto, comprobar salud y reproducir un audio
  nuevo en WhatsApp real.

## Dependencies & Execution Order

T001 precede T003 y T004. T002 y T005 no comparten archivos y pueden hacerse
en paralelo. T007 y T008 cierran ambas historias.
