# HTTP Contracts: Gestión y moderación de chats

Todas las rutas requieren sesión y organización activa. Los IDs se validan
dentro del tenant. Los errores no incluyen credenciales ni respuesta cruda de
Meta.

## DELETE `/api/conversations/:id`

Elimina una conversación real individual y sus mensajes, conservando contacto
y lead.

Respuesta `200`:

```json
{ "ok": true, "affected": 1 }
```

Errores: `400` conversación de laboratorio, `404` inexistente/otro tenant,
`500` fallo interno.

## POST `/api/conversations/bulk`

Entrada común:

```json
{
  "action": "delete | block | unblock | report",
  "conversationIds": ["cv_..."],
  "reason": "spam | harassment | fraud | inappropriate | other",
  "notes": "opcional, máximo 500"
}
```

Reglas:

- Entre 1 y 100 IDs únicos.
- `reason` es obligatorio solo para `report`.
- `notes` solo se acepta para `report`.
- Conversaciones de laboratorio se rechazan para bloquear/desbloquear/reportar.

### Delete response

```json
{ "ok": true, "affected": 3 }
```

### Block response

```json
{
  "ok": true,
  "affected": 3,
  "metaSynced": false,
  "warning": "Los contactos quedaron bloqueados en el CRM, pero falta sincronizar con Meta."
}
```

La respuesta puede ser `200` con advertencia porque la protección local sí se
completó. Un reintento de `block` es idempotente y vuelve a intentar sincronizar.

### Unblock response

```json
{ "ok": true, "affected": 3, "metaSynced": true }
```

Si Meta falla, responde `502`; los contactos permanecen bloqueados.

### Report response

```json
{ "ok": true, "affected": 3, "scope": "internal" }
```

Errores comunes: `400` entrada inválida, `404` ningún ID válido del tenant,
`502` fallo externo al desbloquear, `500` fallo interno.

## GET `/api/conversations`

El DTO de contacto incorpora:

```json
{
  "blockedAt": "2026-08-02T12:00:00.000Z",
  "blockSyncStatus": "synced | failed | null",
  "reportedAt": "2026-08-02T12:05:00.000Z",
  "reportReason": "spam | harassment | fraud | inappropriate | other | null"
}
```

`reportedAt` y `reportReason` corresponden al reporte más reciente y sirven
para el indicador de Bandeja; el historial completo no forma parte de este
contrato.
