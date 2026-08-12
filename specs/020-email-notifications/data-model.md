# Data Model: Notificaciones y resumen semanal por email

## `email_delivery`

Registro de exclusión e historial técnico para una entrega externa.

| Campo | Regla |
|---|---|
| `id` | ID con prefijo `eml_`, clave primaria |
| `organization_id` | NOT NULL, FK a `organization`, tenant del contenido |
| `recipient_user_id` | NOT NULL, FK a `user`, destinatario vigente al crear la fila |
| `kind` | `new_lead`, `weekly_assignee` o `weekly_admin` |
| `lead_id` | FK nullable a `lead`; requerido para `new_lead` |
| `period_start` | Timestamp nullable; requerido para resúmenes semanales |
| `idempotency_key` | NOT NULL y UNIQUE; no contiene email ni secreto |
| `status` | `pending`, `sent` o `failed` |
| `provider_message_id` | ID opaco nullable devuelto por Resend |
| `last_error` | Error sanitizado nullable, sin payload ni secreto |
| `created_at` | Momento de reserva |
| `updated_at` | Última transición |
| `sent_at` | Momento de aceptación por el proveedor, nullable |

Índices: único por `idempotency_key`; índice org-first por `(organization_id, created_at)`.

## Claves deterministas

- Nuevo lead: `new-lead/<organizationId>/<leadId>/<userId>`.
- Resumen responsable: `weekly-assignee/<organizationId>/<periodStart>/<userId>`.
- Panorama admin: `weekly-admin/<organizationId>/<periodStart>/<userId>`.

Los valores permanecen bajo 256 caracteres y se reutilizan como clave idempotente del proveedor.

## Transiciones

```text
ausente ──INSERT──> pending ──aceptado──> sent
                           └──rechazado/timeout──> failed

fila existente (cualquier estado) ──> no vuelve a enviar
```

Un fallo se conserva para diagnóstico pero nunca revierte el dato primario. Un período futuro usa otra clave y no queda bloqueado por el fallo anterior.

## Agregados no persistidos

`WeeklyDigest` se calcula desde `lead`, `pipeline_stage`, `member`, `user`, `contact` y `service`, siempre con `organization_id` explícito. Contiene totales, distribución por etapa, distribución por responsable, no asignados y hasta 20 filas de detalle.
