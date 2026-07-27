# API Contract: Edición unificada del prospecto

## `GET /api/contacts/:id`

Devuelve la fuente de verdad para poblar el editor:

```json
{
  "contact": {
    "id": "ct_...",
    "name": "Ada",
    "phone": "573001234567",
    "email": "ada@example.com",
    "notes": "Prefiere la mañana"
  },
  "stage": {
    "id": "stg_...",
    "name": "En calificación",
    "position": 1,
    "kind": "open"
  },
  "lead": {
    "id": "ld_...",
    "closureReason": null
  }
}
```

## `PATCH /api/contacts/:id`

Campos nuevos o ampliados para el editor:

```json
{
  "name": "Ada Lovelace",
  "phone": "573009876543",
  "email": null,
  "notes": "Nueva nota",
  "stageId": "stg_...",
  "closureReason": null
}
```

Todos son opcionales para conservar compatibilidad con acciones específicas. Si
se envía `stageId`, la etapa se valida y se actualiza junto al contacto.

### Respuesta 200

Devuelve `contact`, `stage` y `lead` actualizados.

### Errores

- `404 not_found`: contacto inexistente en la organización.
- `409 duplicate`: otro contacto de la organización usa el teléfono.
- `422 invalid_body`: formato o longitud inválidos.
- `422 invalid_stage`: etapa inexistente o ajena.
- `422 lead_not_found`: se pidió cambiar etapa en un contacto sin lead.
- `422 closure_reason_required`: falta un motivo permitido para etapa negativa.

Ningún error puede dejar cambios parciales.
