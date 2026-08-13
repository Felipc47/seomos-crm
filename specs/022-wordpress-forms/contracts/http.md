# HTTP Contract: Formularios web

## POST `/api/integrations/forms/{integrationId}/submissions`

Ruta pública consumida por WordPress.

Headers:

```http
Authorization: Bearer <secret>
Content-Type: application/json
```

También acepta `application/x-www-form-urlencoded`. El body no puede superar 32 KiB.

Payload canónico:

```json
{
  "externalId": "wpforms-8842-entry-591",
  "phone": "+57 300 123 4567",
  "name": "Ana Pérez",
  "email": "ana@example.com",
  "message": "Quiero una propuesta de SEO",
  "source": "Sitio principal",
  "campaign": "google-brand",
  "pageUrl": "https://example.com/servicios/seo",
  "consent": true
}
```

Obligatorios: `externalId`, `phone`. Los demás son opcionales. Aliases aceptados en formulario codificado: `external_id`, `submission_id`, `full_name`, `your-name`, `your_email`, `your-email`, `your_phone`, `your-phone`, `your_message`, `your-message`, `page_url`, `utm_campaign`, `acceptance`, `consent`.

Respuesta nueva — `201`:

```json
{
  "status": "processed",
  "submissionId": "wfs_...",
  "contactId": "ct_...",
  "leadId": "ld_..."
}
```

Respuesta duplicada — `200`:

```json
{
  "status": "duplicate",
  "submissionId": "wfs_..."
}
```

Errores:

| HTTP | Code | Meaning |
|---|---|---|
| 401 | `unauthorized` | integración inexistente, empresa suspendida, desactivada o secreto incorrecto |
| 413 | `body_too_large` | body mayor a 32 KiB |
| 415 | `unsupported_media_type` | formato no admitido |
| 422 | `invalid_submission` | campos inválidos; lista segura sin eco de valores |
| 429 | `rate_limited` | demasiados intentos en la ventana |
| 503 | `temporarily_unavailable` | fallo recuperable antes de completar dominio; WordPress puede reintentar el mismo ID |

Nunca responde nombre de empresa, configuración, secreto, stack o payload recibido.

## GET `/api/settings/web-forms`

Requiere sesión y rol administrador. Devuelve integraciones de la organización y servicios elegibles:

```json
{
  "integrations": [{
    "id": "wfi_...",
    "name": "Formulario SEO",
    "serviceId": "svc_...",
    "serviceName": "SEO",
    "enabled": true,
    "secretLast4": "a9K2",
    "lastUsedAt": null,
    "lastStatus": null,
    "lastError": null,
    "endpoint": "https://crm.example.com/api/integrations/forms/wfi_.../submissions"
  }],
  "services": [{ "id": "svc_...", "name": "SEO" }]
}
```

## POST `/api/settings/web-forms`

Body: `{ "name": string, "serviceId": string | null }`.

Respuesta `201` incluye DTO y `secret` completo una única vez. Si el servicio no pertenece a la organización, `422 invalid_service`.

## PATCH `/api/settings/web-forms/{id}`

Body parcial estricto: `{ "name"?: string, "serviceId"?: string | null, "enabled"?: boolean }`. La integración debe pertenecer a la sesión.

## POST `/api/settings/web-forms/{id}/rotate`

Genera e invalida el secreto anterior de forma atómica. Respuesta incluye el nuevo `secret` completo una única vez.

## Permission responses

- Sin sesión: `401 unauthorized`.
- Miembro sin rol administrador: `403 forbidden`.
- Recurso fuera de la empresa: `404 not_found`.
