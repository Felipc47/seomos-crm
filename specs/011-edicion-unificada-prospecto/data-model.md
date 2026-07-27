# Data Model: Edición unificada del prospecto

No se requieren tablas ni migraciones. Se amplía el contrato de actualización
sobre entidades existentes.

## Contacto

| Campo | Regla de edición |
|---|---|
| `name` | Obligatorio, trim, 1–120 caracteres |
| `phone` | Obligatorio, normalizado a 7–15 dígitos, único por organización |
| `email` | Opcional, correo válido, máximo 254 |
| `notes` | Opcional, máximo 4000 |

La actualización conserva `id`, `organization_id`, ficha de IA, consentimiento,
baja, archivo, fechas y todas las relaciones.

## Lead

| Campo | Regla de edición |
|---|---|
| `stage_id` | Debe pertenecer a la misma organización |
| `closure_reason` | Obligatorio y permitido para etapas negativas |
| `closed_at` | Se calcula según la etapa terminal |
| `follow_up_due_at` | Se limpia al mover manualmente la etapa |
| `follow_up_attempts` | Vuelve a cero al mover manualmente la etapa |

## Invariantes

- Contacto y lead se actualizan dentro de una sola transacción.
- Un conflicto de teléfono revierte toda la operación.
- Una etapa ajena o inexistente no produce cambios.
- Sin cambio de etapa, seguimiento y cierre permanecen intactos.
- Toda consulta incluye `organization_id`.
