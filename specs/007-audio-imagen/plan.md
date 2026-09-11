# Implementation Plan: Audio interoperable y previsualización de imágenes

**Branch**: `027-asistente-configuracion` | **Date**: 2026-09-11 | **Spec**:
[spec.md](./spec.md)

## Summary

Corregir el camino de notas de voz salientes para preferir AAC/MP4, conservar
OGG/Opus como alternativa y enviar a Meta un MIME canónico. Cambiar el hilo
para que toda imagen disponible se cargue y se vea al abrir la conversación,
con degradación explícita si Meta ya no la conserva.

## Technical Context

**Language/Version**: TypeScript estricto, Next.js 15, React 19.

**Primary Dependencies**: APIs del navegador (`MediaRecorder`, `<img>`),
FFmpeg local en el contenedor y WhatsApp Cloud API mediante el adaptador
`src/lib/meta/client.ts`.

**Storage**: PostgreSQL existente; no hay cambios de esquema ni se almacenan
binarios.

**Testing**: Vitest para normalización de MIME; self-test E2E con wa-mock y
verificación de interfaz local mediante navegador.

**Target Platform**: Navegadores modernos, servidor Next.js en Docker/Linux.

**Project Type**: Monolito web multi-tenant.

**Performance Goals**: La imagen empieza a cargarse al renderizar su burbuja;
un fallo de media no impide renderizar el hilo.

**Constraints**: Sin servicios ni almacenamiento externo ni reintentos que
dupliquen mensajes. FFmpeg usa un directorio temporal por solicitud y siempre
lo elimina. Todo acceso a media continúa autenticado y con cache privada.

## Constitution Check

- I Seguridad: PASS. No se expone ninguna credencial ni binario persistente.
- II Soberanía: PASS. Solo se usa el adaptador de WhatsApp ya existente.
- III Multi-tenancy: PASS. Se reutiliza la ruta de media autenticada y acotada
  por organización.
- IV Idempotencia: PASS. No se agregan webhooks ni reintentos de envío.
- V/IX Calidad y comportamiento: PASS pendiente de gate, E2E y UI local.

## Design

1. Centralizar la normalización del MIME permitido en `src/lib/wa-media.ts`.
2. Usar el MIME canónico en la subida y persistencia de adjuntos de
   `src/server/inbox/send.ts`.
3. Ordenar la negociación de `MediaRecorder` en `src/components/inbox/composer.tsx`:
   AAC/MP4 primero; OGG/Opus solo cuando es la alternativa compatible.
4. Iniciar `MediaRecorder` sin `timeslice` para que el evento final entregue un
   MP4 completo, con duración e índice válidos para el procesamiento de Meta.
5. Marcar explícitamente el audio del composer como nota de voz, convertirlo
   localmente a OGG/Opus y enviar a Meta `audio.voice=true`.
6. Renderizar directamente `ImageAttachment` en
   `src/components/inbox/message-thread.tsx`; en error, mostrar la degradación
   actual sin botón de descarga.

## Project Structure

```text
src/components/inbox/composer.tsx        # captura de audio
src/components/inbox/message-thread.tsx  # vista previa de imágenes
src/lib/wa-media.ts                      # MIME permitido/canónico
src/server/inbox/send.ts                 # subida a Meta y persistencia
src/server/whatsapp/voice-note.ts        # conversión local OGG/Opus
Dockerfile                               # FFmpeg en runtime
tests/unit/wa-media.test.ts              # MIME con parámetros de códec
tests/e2e/us16-adjuntos.sh               # round-trip de audio saliente
tests/e2e/us15-reproducir-media.*        # contrato de media autenticada
tests/e2e/us35-media-ui.mjs               # navegador: imagen auto-preview
tests/e2e/us36-audio-container.mjs         # navegador → OGG/Opus → Meta mock
```

**Structure Decision**: Se modifica el flujo existente; no se crean tablas,
rutas públicas ni servicios nuevos.
