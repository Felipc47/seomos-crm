# Plan 016 — Plantillas con encabezado multimedia

## Datos
- `template` + columnas: `header_kind` (`image|document`, null = sin
  encabezado), `header_filename`, `header_mime`, `header_media_id`,
  `header_media_uploaded_at`.
- Tabla nueva `template_media` (1:1): `template_id` PK/FK cascade,
  `organization_id` NOT NULL, `bytes` bytea, timestamps. Separada para que
  los SELECT * de plantillas (lista, campañas) no carguen el binario.
- Migración 0020 vía `pnpm db:generate`.

## Meta (frontera única: src/lib/meta/client.ts)
- `graphCreateUploadSession(token, {fileLength, fileType, fileName})` →
  POST `app/uploads?...` → session id.
- `graphUploadToSession(token, sessionId, bytes)` → POST binario con
  `Authorization: OAuth`, header `file_offset: 0` → `{ h }` (header_handle).
- El envío del media de cada campaña reusa `graphUpload` existente
  (`{phone_number_id}/media`).

## Server (src/server/whatsapp/templates.ts)
- `validateTemplateHeader({kind,mime,bytes})` — imagen jpg/png ≤5MB, doc pdf
  ≤16MB.
- `createTemplate` acepta `header`; guarda bytes; si va a Meta, sube el
  ejemplo y agrega `{type:HEADER, format, example:{header_handle:[h]}}`.
- `updateTemplate`/`submitTemplate`: si la plantilla tiene encabezado, el
  push a Meta SIEMPRE re-incluye el componente HEADER (Meta reemplaza todos
  los componentes al editar) con handle recién subido desde `template_media`;
  archivo reemplazable en PATCH (mismo kind) → invalida `header_media_id`.
- `sendTemplate`: tras los guards (sandbox, bloqueado, creds), con
  `headerKind` asegura `header_media_id` fresco (<25 días; si no, re-sube
  bytes) y agrega el componente `header` a los parámetros; el mensaje
  persiste `media_id/mime/filename` para el hilo.

## API
- POST `/api/templates` y PATCH `/api/templates/[id]` aceptan además
  `multipart/form-data` (campos actuales + `headerKind` + `headerFile`).
  JSON sigue funcionando sin encabezado.

## UI
- `templates-client.tsx`: selector Encabezado (Ninguno/Imagen/Documento) +
  archivo en CreateForm; chip del encabezado en la ficha; reemplazo del
  archivo al editar. `TemplateDto` + `headerKind/headerFilename`.
- `message-thread.tsx`: mensaje `template` con media → adjunto + texto.

## wa-mock
- `app/uploads` → session; POST binario a session → `{h}` (antes del parse
  JSON del handler). Alta/edición de plantilla acepta HEADER y exige
  `header_handle` (400 código 100 si falta — camino infeliz). El GET de
  lista incluye el componente HEADER.

## Verificación
- Unit: validación del encabezado.
- E2E con mocks (navegador + API): crear plantilla con imagen → aprobar vía
  mock → campaña a 2 contactos → outbox del mock trae el componente header
  con el MISMO media id en ambos; PDF ídem; caminos infelices (archivo malo,
  alta sin handle). Gate: typecheck+lint+build+test.
