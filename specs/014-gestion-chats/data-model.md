# Data Model: Gestión y moderación de chats

## Contact

Estado actual que sobrevive a eliminar o recrear una conversación.

Campos nuevos:

- `blocked_at`: fecha nullable; no nulo significa bloqueo local activo.
- `blocked_by_user_id`: actor nullable con FK a usuario y `ON DELETE SET NULL`.
- `block_sync_status`: `synced` o `failed`, nullable cuando no hay bloqueo.
- `block_sync_error`: mensaje sanitizado nullable para diagnóstico/reintento.

Reglas:

- Todas las escrituras incluyen `organization_id` en el filtro.
- Al bloquear: se fijan fecha/actor y estado local antes de sincronizar.
- Si Meta acepta: `block_sync_status = synced` y se limpia el error.
- Si Meta falla: el bloqueo permanece y `block_sync_status = failed`.
- Al desbloquear: primero se sincroniza; solo después se limpian los cuatro
  campos.
- El contacto bloqueado no puede ser destinatario de ningún envío ni turno IA.

Índices:

- `(organization_id, blocked_at)` para exclusiones y filtros tenant-first.

## Contact Report

Evento append-only de moderación interna.

Campos:

- `id`: nanoid con prefijo de dominio.
- `organization_id`: tenant NOT NULL, FK a organización.
- `contact_id`: contacto reportado NOT NULL, FK con cascada al eliminar el
  contacto.
- `conversation_id`: conversación de origen nullable, FK `ON DELETE SET NULL`
  para conservar auditoría si el chat se elimina.
- `reason`: `spam | harassment | fraud | inappropriate | other`.
- `notes`: texto nullable, máximo 500 caracteres en entrada.
- `reported_by_user_id`: actor nullable, FK `ON DELETE SET NULL`.
- `created_at`: fecha de creación.

Índices:

- `(organization_id, contact_id, created_at)` para historial tenant-first.
- `(organization_id, created_at)` para auditoría reciente.

## Conversation

No agrega estado permanente. Al eliminarla:

- sus mensajes se eliminan por la cascada existente;
- los casos de laboratorio conservan su seguridad y no entran en moderación;
- los reportes conservan `contact_id` y ponen `conversation_id` en null;
- contacto y lead permanecen;
- la ingesta posterior puede crear una nueva conversación usando la unicidad
  existente de organización/contacto.

## State Transitions

```text
ACTIVE --block(local)--> BLOCKED_PENDING_SYNC
BLOCKED_PENDING_SYNC --Meta OK--> BLOCKED_SYNCED
BLOCKED_PENDING_SYNC --Meta error--> BLOCKED_FAILED
BLOCKED_FAILED --retry + Meta OK--> BLOCKED_SYNCED
BLOCKED_* --unblock + Meta error--> BLOCKED_*
BLOCKED_* --unblock + Meta OK--> ACTIVE
```

Los reportes no participan en este estado: son eventos independientes.
