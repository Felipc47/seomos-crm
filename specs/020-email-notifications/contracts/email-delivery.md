# Contracts: correo transaccional y barrido semanal

## Adaptador Resend

`POST {RESEND_BASE_URL}/emails`

Headers del servidor:

- `Authorization: Bearer <RESEND_API_KEY>`
- `Content-Type: application/json`
- `Idempotency-Key: <clave determinista>`

Cuerpo:

```json
{
  "from": "Seomos CRM <notificaciones@updates.example.com>",
  "to": ["persona@example.com"],
  "subject": "Nuevo prospecto: Ada",
  "html": "<contenido escapado>",
  "text": "contenido equivalente"
}
```

Éxito: HTTP 2xx y JSON `{ "id": "..." }`. Cualquier otro estado, timeout, JSON inesperado o excepción produce un error sanitizado y recuperable.

## `GET|POST /api/cron/sweep`

Conserva autenticación `Authorization: Bearer <AGENT_SWEEP_SECRET>` y agrega el resultado:

```json
{
  "ok": true,
  "processed": 0,
  "followUps": {},
  "weeklyEmail": {
    "attempted": 3,
    "sent": 3,
    "failed": 0,
    "deduplicated": 0,
    "skippedUnconfigured": false
  }
}
```

- Secreto ausente/incorrecto: 404 sin revelar el endpoint.
- Proveedor no configurado: HTTP 200, `skippedUnconfigured=true`; los demás barridos se ejecutan.
- Fallos parciales: HTTP 200 con contador `failed`; no se exponen direcciones, payloads ni errores crudos.
- En mock no productivo, `?now=<ISO>` fija la fecha del período; se ignora en producción.

## Mock interno de Resend

- `POST /api/dev/resend-mock/emails`: captura entregas válidas o responde fallo controlado.
- `GET /api/dev/resend-mock`: lista metadatos/contenido no secreto para aserciones E2E.
- `DELETE /api/dev/resend-mock`: limpia el buzón.
- Producción: todas devuelven 404 mediante el gate central.
