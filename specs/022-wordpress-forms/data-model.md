# Data Model: Integración de formularios WordPress

## `web_form_integration`

Configuración mutable administrada por una empresa.

| Field | Type | Rules |
|---|---|---|
| `id` | text | PK, prefijo `wfi_`; identificador público no secreto |
| `organization_id` | text | NOT NULL, FK organization cascade, primer campo de índices |
| `name` | text | NOT NULL, 1–80 caracteres sanitizados |
| `service_id` | text nullable | FK service set null; el servicio debe pertenecer a la misma empresa |
| `secret_cipher` | text | NOT NULL, AES-256-GCM base64 |
| `secret_iv` | text | NOT NULL |
| `secret_tag` | text | NOT NULL |
| `secret_last4` | text | NOT NULL, solo diagnóstico visual |
| `enabled` | boolean | NOT NULL, default true |
| `last_used_at` | timestamp nullable | Última solicitud autenticada y validada |
| `last_status` | text nullable | `success`, `duplicate` o `failed` |
| `last_error` | text nullable | Mensaje controlado, nunca body/secreto/error crudo |
| `created_at` | timestamp | NOT NULL |
| `updated_at` | timestamp | NOT NULL |

Índices: `web_form_integration_org_created_idx(organization_id, created_at)` y FK de servicio validada en la mutación.

Estados:

```text
enabled ──disable──> disabled
disabled ──enable──> enabled
   cualquier estado ──rotate──> mismo estado + secreto anterior inválido
```

## `web_form_submission`

Ledger idempotente de una entrega externa; no contiene el payload.

| Field | Type | Rules |
|---|---|---|
| `id` | text | PK, prefijo `wfs_` |
| `organization_id` | text | NOT NULL, FK organization cascade |
| `integration_id` | text | NOT NULL, FK integration cascade |
| `external_id` | text | NOT NULL, 1–128 caracteres |
| `contact_id` | text nullable | FK contact set null |
| `lead_id` | text nullable | FK lead set null |
| `status` | text | `processing`, `processed`, `failed`; NOT NULL |
| `greeting_attempted_at` | timestamp nullable | Se fija antes de contactar WhatsApp |
| `last_error` | text nullable | Error seguro y reintentable |
| `created_at` | timestamp | NOT NULL |
| `processed_at` | timestamp nullable | Finalización durable |
| `updated_at` | timestamp | NOT NULL |

Índice único: `(organization_id, integration_id, external_id)`. Índice operativo: `(organization_id, integration_id, created_at)`.

Transiciones:

```text
new ──reserve──> processing ──domain committed──> processed
                         └──recoverable error──> failed
failed ──authenticated retry──> processing
processing antiguo ──reclaim after timeout──> processing
processed ──duplicate──> processed (sin efectos)
```

## Cambio a `contact`

`consent_source` amplía el enum con `web_form`. El permiso explícito vive en `consent_granted_at`; un formulario sin `consent=true` conserva ese campo nulo.

## Invariantes multi-tenant

- `integration.organization_id`, `submission.organization_id`, contacto, lead y servicio deben coincidir.
- La ruta pública obtiene `organization_id` exclusivamente desde la integración, nunca desde el body.
- La ruta interna obtiene la organización exclusivamente desde la sesión.
- No se devuelve `secret_cipher`, `secret_iv` ni `secret_tag` en DTO alguno.
