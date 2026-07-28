# HTTP Contracts: Asignación de servicios

Todas las rutas requieren sesión y operan sobre la organización activa.

## GET `/api/services`

Respuesta relevante:

```json
{
  "services": [
    {
      "id": "svc_...",
      "name": "Desarrollo web",
      "assignedMemberId": "org_...",
      "assignedExecutive": {
        "memberId": "org_...",
        "name": "Ana Comercial"
      },
      "greetingTemplateId": null,
      "templateName": null,
      "forms": ["form_123"]
    }
  ],
  "executives": [
    {
      "memberId": "org_...",
      "name": "Ana Comercial",
      "email": "ana@example.com"
    }
  ],
  "detectedForms": []
}
```

`executives` incluye únicamente miembros comerciales de la organización.

## PATCH `/api/services/:id`

El contrato existente se amplía:

```json
{
  "assignedMemberId": "org_..."
}
```

Para quitar responsable:

```json
{
  "assignedMemberId": null
}
```

Respuestas:

- `200 { "ok": true }`: cambio persistido.
- `403 forbidden`: actor sin rol administrador.
- `404 not_found`: servicio ajeno o inexistente.
- `422 invalid_assignee`: miembro ajeno, inexistente o no comercial.

Los campos existentes `name` y `greetingTemplateId` conservan su contrato. La
restricción de administrador aplica cuando el payload contiene
`assignedMemberId`.

## GET `/api/settings/team`

Cada miembro suma:

```json
{
  "services": [
    { "id": "svc_...", "name": "Desarrollo web" }
  ]
}
```

Para miembros no comerciales o sin servicios, `services` es `[]`.

## Listados comerciales

Las respuestas de conversaciones, pipeline y contactos incorporan:

```json
{
  "service": { "id": "svc_...", "name": "Desarrollo web" },
  "assignee": { "memberId": "org_...", "name": "Ana Comercial" }
}
```

Cada propiedad acepta `null`. La ficha `GET /api/contacts/:id` devuelve el
mismo resumen dentro de `lead`.

## Evento leadgen

El webhook público no cambia. Para cada `leadgen_id` aceptado por primera vez:

1. Resuelve el formulario y servicio dentro de la organización.
2. Crea o actualiza actividad del prospecto.
3. Copia `serviceId` y el miembro comercial vigente.
4. Guarda la relación del evento con el contacto.
5. Intenta notificar al usuario del miembro asignado.

Un `leadgen_id` repetido termina antes de los pasos 1–5.
