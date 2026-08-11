# Plan 018 — Variables de plantilla

## Datos
- `template.variables` jsonb (migración 0021): array posicional
  `[{ source, value?, fallback? }]` — `source` ∈ first_name · name · phone ·
  email · notes · service · stage · fixed; `value` solo para fixed;
  `fallback` opcional. NULL = plantilla legacy (regla vieja: ≤1 variable).

## Módulo nuevo `src/server/whatsapp/template-vars.ts`
- Catálogo de fuentes (etiqueta ES + valor de ejemplo para Meta).
- `validateTemplateVariables(body, mapping)` — contigüidad {{1}}..{{N}},
  N≤5, mapeo completo, fixed con valor; legacy (mapping null) → regla vieja.
- `exampleValues(mapping)` — ejemplos para `body_text` de Meta.
- `resolveTemplateVariables(mapping, ctx)` — ctx = contacto + nombres de
  servicio/etapa del lead; vacío → fallback → si sigue vacío, error con la
  variable y fuente faltantes.

## templates.ts
- create/update aceptan `variables`; validación central; push a Meta con
  `example.body_text = [exampleValues]` cuando N≥1 (create, edit y submit).
- `sendTemplate`: si la plantilla está mapeada, carga lead+servicio+etapa
  del contacto y resuelve TODAS las variables (ignora `input.variable`);
  componentes body con N parámetros; el texto persistido usa los valores
  resueltos. Legacy intacto.
- `renderBody(body, values: string | string[])`.

## API
- POST/PATCH de plantillas: campo `variables` (en multipart viaja como JSON
  string). Serializer + `TemplateDto.variables`.

## Campañas
- `createCampaign`: plantilla mapeada → no exige `variableMode`; runner pasa
  variable solo para legacy. Fallo de resolución por destinatario =
  `failed` de ese destinatario (no pausa — no es fallo del canal).
- UI: plantilla mapeada → se oculta el selector de variable y se muestra el
  resumen del mapeo («{{1}} = Primer nombre · {{2}} = Servicio…»).

## Bandeja y flujos automáticos
- `template-sender`: mapeada → sin input, con resumen; legacy → input.
- Saludo de leads y seguimiento: sin cambios de código de llamada — la
  variable legacy que pasan se ignora cuando hay mapeo.

## Verificación
- Unit: validación + resolución (contigüidad, fallback, faltantes).
- E2E mocks: criterios 1–6 del spec (outbox con parámetros distintos por
  contacto; destinatario sin dato → failed con mensaje, campaña `done`).
