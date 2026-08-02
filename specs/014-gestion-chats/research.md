# Research: Gestión y moderación de chats

## Eliminación y frontera de datos

**Decision**: Eliminar una conversación borra la fila de conversación y sus
mensajes por cascada, pero conserva contacto, lead, bloqueo y reporte.

**Rationale**: El usuario pidió eliminar chats desde Bandeja, mientras que el
producto ya ofrece una acción separada para eliminar el contacto completo. La
separación evita pérdida silenciosa de atributos comerciales y permite que un
nuevo mensaje entrante recree la conversación con el mismo contacto.

**Alternatives considered**:

- Vaciar solo mensajes: se solapa con “Reiniciar conversación” y deja una
  tarjeta vacía en Bandeja.
- Eliminar contacto: demasiado destructivo y duplica la acción existente.
- Soft-delete: complica unicidad y reingreso sin aportar recuperación visible
  en el alcance actual.

## Bloqueo en Meta WhatsApp Cloud API

**Decision**: Usar el recurso oficial `/{phone-number-id}/block_users` a través
del cliente Graph existente. El bloqueo local se guarda antes de llamar a Meta;
el desbloqueo local solo se limpia después de que Meta acepte la operación.

**Rationale**: La colección oficial de Meta documenta POST para bloquear,
DELETE para desbloquear y GET para consultar usuarios bloqueados. Aplicar
primero el bloqueo local protege todos los caminos del CRM aunque Meta esté
temporalmente indisponible. Mantener el bloqueo durante un fallo de desbloqueo
evita que el CRM envíe mientras el canal aún considera bloqueado al número.

**Sources**:

- Meta, colección oficial: https://www.postman.com/meta/whatsapp-business-platform/overview
- Bloquear: https://www.postman.com/meta/whatsapp-business-platform/request/ywjuxcf/block-user-s
- Desbloquear: https://www.postman.com/meta/whatsapp-business-platform/request/uv3p1z9/unblock-user-s
- Consultar bloqueados: https://www.postman.com/meta/whatsapp-business-platform/request/bwuh1jp/get-blocked-users

**Alternatives considered**:

- Estado únicamente local: protege el CRM, pero permite que otros clientes del
  mismo número sigan interactuando y no refleja la intención en el canal.
- Hacer depender el bloqueo local del éxito remoto: abre una ventana de envíos
  no deseados durante fallas externas.

## Reportes

**Decision**: Guardar el reporte como evidencia interna y no afirmar que se
envía a Meta.

**Rationale**: La colección oficial revisada no expone una operación pública
para reportar spam o abuso desde una cuenta de negocio. Inventar esa
sincronización sería engañoso. Un registro local con actor, fecha, razón y notas
sí sirve para moderación y auditoría.

**Alternatives considered**:

- Simular reporte externo: rechazado por contrato inexistente.
- Hacer que reportar bloquee automáticamente: mezcla dos decisiones distintas
  y puede interrumpir contactos que solo requieren documentación.

## Persistencia del reporte

**Decision**: Crear una tabla de reportes append-only y mantener en el contacto
el estado de bloqueo y sincronización.

**Rationale**: Un reporte es un evento auditable que puede repetirse; una tabla
preserva historia y actor. El bloqueo es estado actual y encaja en contacto,
porque debe sobrevivir a la eliminación/recreación de conversaciones.

**Alternatives considered**:

- Guardar solo el último reporte en contacto: pierde historia y confunde un
  evento con un estado.
- Guardar bloqueo en conversación: se perdería al eliminar el chat.

## Operaciones masivas

**Decision**: Lotes explícitos de hasta 100 IDs únicos, validados y filtrados
por organización, con una única acción por solicitud.

**Rationale**: El límite mantiene payloads y llamadas externas acotados, evita
acciones accidentales sobre resultados no visibles y simplifica resultados
parciales sin infraestructura de colas.
