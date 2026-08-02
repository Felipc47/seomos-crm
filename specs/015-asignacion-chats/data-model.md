# Data Model: Asignación y transferencia de chats

## Entidades existentes reutilizadas

### `member`

- `id`: identidad estable usada para asignar.
- `organization_id`: frontera obligatoria del destino.
- `user_id`: permite identificar al miembro actual y notificar al destinatario.
- `role`: informativo en las opciones; todos los roles con Bandeja son válidos.

### `lead`

- `organization_id`: frontera tenant.
- `contact_id`: relación única con el contacto de la conversación.
- `assigned_member_id`: fuente única del responsable; nullable para “Sin asignar”.
- `service_id`, `stage_id`, seguimiento, cierre y posiciones: no cambian durante
  una transferencia.
- El índice `lead_org_assignee_idx` ya cubre organización + responsable.

### `conversation`

- Conserva el mismo `id`, `contact_id`, estado de IA, handoff, no leídos,
  anclado, archivado, ventana y timestamps.
- No recibe campos nuevos.

### `message`

- Conserva todos los registros ligados al mismo `conversation_id`, incluidos
  contenido, multimedia, dirección, estado, error, autoría IA y orden temporal.

### `notification`

- Se crea solo para una transferencia efectiva hacia otra persona.
- `user_id` identifica al destinatario, `organization_id` conserva aislamiento y
  `href` abre `/inbox?contact=<contactId>`.

## DTOs

### `InboxAssigneeOptionDto`

- `memberId: string`
- `name: string`
- `role: string`
- `isCurrent: boolean`

### Estado de opciones

- `currentMemberId: string`: miembro correspondiente a la sesión.
- `members: InboxAssigneeOptionDto[]`: solo miembros de la empresa activa,
  ordenados por nombre.

## Reglas de validación

1. La conversación debe ser real, existir y pertenecer a la empresa activa.
2. `memberId` acepta identificador no vacío o `null`.
3. Un destino no nulo debe pertenecer a la misma empresa en el momento de
   confirmar.
4. El prospecto debe pertenecer a la misma empresa y contacto; si no existe, se
   crea idempotentemente en la primera etapa abierta.
5. El cambio modifica solo responsable y timestamp de actualización.
6. Destino igual al actual produce éxito `changed=false`, sin notificación.
7. Un fallo al crear la notificación no modifica `changed=true` ni revierte BD.

## Transiciones

```text
Sin asignar ──transferir(member)──> Asignado a miembro
Asignado A  ──transferir(B)───────> Asignado B
Asignado A  ──transferir(null)────> Sin asignar
Asignado A  ──transferir(A)───────> Asignado A (sin efecto)
```

En todas las transiciones, conversación y mensajes son invariantes.

## Migración

No aplica. El campo, FK `onDelete: set null` e índice requeridos ya existen.
