# Tasks 016 — Plantillas con encabezado multimedia

- [x] T1. Schema: columnas header en `template` + tabla `template_media` (bytea) + migración 0020
- [x] T2. Meta client: sesión de Resumable Upload + subida binaria → header_handle
- [x] T3. templates.ts: validación, create/update/submit con HEADER, sendTemplate con media fresco
- [x] T4. API multipart en POST /api/templates y PATCH /api/templates/[id]
- [x] T5. UI: CreateForm con encabezado, chip en ficha, reemplazo en edición, TemplateDto
- [x] T6. Hilo: mensaje template con adjunto
- [x] T7. wa-mock: uploads + HEADER en alta/edición/lista + validación header_handle
- [x] T8. Unit tests de validación (6 casos nuevos)
- [x] T9. Gate técnico verde (typecheck+lint+build+227 tests)
- [x] T10. E2E con mocks — TODO VERDE (2026-08-06):
  - Imagen: alta con HEADER+handle → aprobada → campaña 2 destinatarios con
    UN solo media_id compartido.
  - PDF: ídem con `filename` en el parámetro document.
  - Renovación: media con 30 días → el siguiente envío re-sube y usa id nuevo.
  - Comercial: la plantilla con encabezado queda local (`awaiting_approval`,
    NO está en Meta) y al aprobarla el admin llega con HEADER IMAGE.
  - Edición JSON de plantilla con encabezado → re-incluye HEADER (el mock
    rechaza la edición sin él).
  - Infelices: webp → 422 "JPG o PNG"; PNG 6 MB → 422 "supera el máximo";
    ambos sin tocar Meta.
  - UI verificada: selector en Nueva plantilla, chips "Imagen · promo.png" /
    "PDF · brochure.pdf", hilo muestra el adjunto sobre el cuerpo.
