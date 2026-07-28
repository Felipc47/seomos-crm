# Data Model: Asignación de servicios a ejecutivos

## Service

Campo nuevo:

| Campo | Tipo | Regla |
|---|---|---|
| `assigned_member_id` | text nullable | FK a `member.id`, `ON DELETE SET NULL` |

Validaciones de dominio:

- El miembro debe pertenecer al mismo `organization_id`.
- El rol normalizado debe ser ejecutivo comercial.
- `null` representa “Sin asignar”.
- Índice `service_org_assignee_idx (organization_id, assigned_member_id)`.

## Lead

Campos nuevos:

| Campo | Tipo | Regla |
|---|---|---|
| `service_id` | text nullable | FK a `service.id`, `ON DELETE SET NULL` |
| `assigned_member_id` | text nullable | FK a `member.id`, `ON DELETE SET NULL` |

Validaciones de dominio:

- Ambos valores se escriben únicamente sobre un lead de la organización activa.
- `service_id` puede existir con `assigned_member_id = null`.
- La pareja se actualiza por un nuevo evento leadgen; un cambio de configuración
  por sí solo no altera leads existentes.
- Índice `lead_org_assignee_idx (organization_id, assigned_member_id)`.

## Assignment summary DTO

```text
service:
  id: string
  name: string
  | null

assignee:
  memberId: string
  name: string
  | null
```

El resumen se utiliza en Bandeja, Pipeline, Contactos y ficha de contacto. No
incluye correo, `user_id` ni información de otra organización.

## State transitions

```text
Servicio sin responsable
  └─ admin asigna miembro comercial → Servicio asignado
       ├─ admin cambia responsable → Servicio asignado a otro miembro
       ├─ admin quita responsable → Servicio sin responsable
       └─ miembro deja rol comercial → Servicio sin responsable

Evento leadgen nuevo
  ├─ servicio asignado → lead(service, member) + notificación
  ├─ servicio sin responsable → lead(service, null)
  └─ formulario sin vínculo → lead(null, null)

Evento duplicado
  └─ sin cambios ni notificación
```

## Tenant invariants

- Toda lectura y escritura incluye `organization_id`.
- No se confía en el FK para validar pertenencia: el endpoint verifica
  explícitamente servicio, miembro y rol dentro del tenant.
- Los joins de visualización parten de una fila ya limitada por organización.
