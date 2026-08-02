# HTTP Contract: Asignación de chats

Todas las rutas requieren sesión y usan la organización activa de servidor.

## GET `/api/conversations/assignment-options`

Devuelve el miembro actual y destinos válidos de la empresa.

### 200

```json
{
  "currentMemberId": "org_member_current",
  "members": [
    {
      "memberId": "org_member_current",
      "name": "Ana Comercial",
      "role": "commercial",
      "isCurrent": true
    }
  ]
}
```

### Errors

- `401 unauthorized`: sin sesión.
- `404 membership_not_found`: la sesión ya no tiene miembro en la empresa.

## PATCH `/api/conversations/{conversationId}/assignee`

Transfiere o desasigna el prospecto asociado al chat.

### Body

```json
{ "memberId": "org_member_target" }
```

Para dejar sin asignar:

```json
{ "memberId": null }
```

No se aceptan campos adicionales.

### 200

```json
{
  "changed": true,
  "conversation": {
    "id": "cv_same_id",
    "assignee": {
      "memberId": "org_member_target",
      "name": "Bruno Comercial"
    }
  }
}
```

La respuesta real incluye el DTO completo de conversación. `changed` es `false`
si el destino ya era el responsable actual.

### Errors

- `422 invalid_body`: body ausente, inválido o con campos desconocidos.
- `401 unauthorized`: sin sesión.
- `404 not_found`: conversación inexistente, de otra empresa o de Laboratorio.
- `422 invalid_assignee`: destino inexistente o de otra empresa.
- `422 assignment_unavailable`: no existe una etapa abierta para crear el
  prospecto mínimo de un chat que aún no tenía uno.

## Eventos

Una transferencia efectiva publica `conversation.updated` con el DTO completo.
El destinatario diferente del actor recibe además `notification.new` y puede
recuperar su notificación persistida desde el listado de notificaciones.
