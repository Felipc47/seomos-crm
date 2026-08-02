# Feature Specification: Asignación y transferencia de chats

**Feature Branch**: `015-asignacion-chats`

**Created**: 2026-08-02

**Status**: Complete

**Input**: User description: "Agregar en Bandeja un filtro para ver solo los
chats asignados a mí y permitir transferir una conversación a otra persona del
equipo conservando todo su historial."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver mis conversaciones (Priority: P1)

Como miembro del equipo quiero activar “Asignados a mí” en Bandeja para
concentrarme únicamente en las conversaciones bajo mi responsabilidad sin
perder la posibilidad de volver a ver todas.

**Why this priority**: Reduce el ruido operativo y convierte la asignación
existente en una cola de trabajo útil para cada persona.

**Independent Test**: Iniciar sesión con un miembro que tenga chats propios,
ajenos y sin asignar; activar el filtro y comprobar que solo aparecen los
propios, con contadores, búsqueda, etapa, no leídos y archivados funcionando.

**Acceptance Scenarios**:

1. **Given** un miembro con dos chats asignados y otros chats de la empresa,
   **When** activa “Asignados a mí”, **Then** solo ve sus dos chats.
2. **Given** el filtro personal activo, **When** usa búsqueda, etapa o pestaña
   de no leídos/archivados, **Then** los filtros se combinan sin mostrar chats
   de otros responsables.
3. **Given** el filtro personal activo, **When** vuelve a “Todos los
   responsables”, **Then** recupera la vista completa permitida por su rol.
4. **Given** un miembro sin chats asignados, **When** activa el filtro,
   **Then** ve un estado vacío claro y puede volver a la vista completa.

---

### User Story 2 - Transferir un chat (Priority: P1)

Como miembro del equipo quiero transferir un chat a otra persona de mi empresa
para que asuma la atención con todo el contexto acumulado.

**Why this priority**: Hace posible repartir y escalar atención humana sin
copiar información ni fragmentar la relación con el prospecto.

**Independent Test**: Abrir un chat con mensajes y adjuntos, transferirlo a un
segundo miembro y comprobar que cambia el responsable mientras conversación,
mensajes, archivos, estado, notas, prospecto y contacto permanecen intactos.

**Acceptance Scenarios**:

1. **Given** un chat asignado al miembro A con historial, **When** A lo
   transfiere al miembro B, **Then** B queda como responsable y el hilo conserva
   todos sus mensajes en el mismo orden.
2. **Given** un chat transferido, **When** B lo abre, **Then** puede consultar el
   historial anterior y continuar respondiendo desde el mismo chat.
3. **Given** un chat asignado, **When** un miembro selecciona “Sin asignar”,
   **Then** el chat conserva el historial y deja de aparecer en la cola personal
   del responsable anterior.
4. **Given** un destino que no pertenece a la empresa activa, **When** se intenta
   transferir mediante una solicitud manipulada, **Then** la operación se
   rechaza sin revelar datos ni modificar el responsable actual.
5. **Given** el mismo responsable actual, **When** se repite la transferencia,
   **Then** el resultado es idempotente y no genera alertas duplicadas.

---

### User Story 3 - Recibir y reflejar la transferencia (Priority: P2)

Como destinatario quiero enterarme de que recibí una conversación y verla
aparecer en mi cola sin recargar manualmente.

**Why this priority**: Evita que una transferencia correcta pase inadvertida y
reduce el tiempo hasta la siguiente respuesta al cliente.

**Independent Test**: Mantener dos sesiones abiertas, transferir desde una y
comprobar que la otra recibe una notificación enlazada al chat y actualiza el
responsable/filtro en tiempo real.

**Acceptance Scenarios**:

1. **Given** dos miembros conectados, **When** A transfiere un chat a B,
   **Then** B recibe una notificación con acceso directo a esa conversación.
2. **Given** B tiene activo “Asignados a mí”, **When** recibe la transferencia,
   **Then** el chat aparece en su lista sin recargar la página.
3. **Given** A tiene activo “Asignados a mí”, **When** transfiere el chat a B,
   **Then** el chat deja de aparecer en la lista de A sin cerrar ni borrar el
   hilo para B.

### Edge Cases

- Un chat sin prospecto asociado debe poder recibir responsable; se crea o
  recupera el prospecto mínimo sin recrear contacto ni conversación.
- Si el miembro destino fue eliminado o cambió de empresa antes de confirmar,
  la transferencia se rechaza y conserva la asignación anterior.
- Si el chat fue eliminado o pertenece a otra empresa, se responde como recurso
  inexistente y no se modifica ningún prospecto.
- Los chats del Laboratorio no se muestran ni pueden transferirse desde esta
  función.
- Cambiar de filtro limpia selecciones masivas que ya no estén visibles y no
  deja acciones aplicables sobre elementos ocultos.
- Una notificación fallida no revierte una transferencia ya persistida; el chat
  sigue disponible y el cambio en vivo continúa.
- El nombre de un miembro muy largo no debe desbordar la lista, el encabezado o
  el diálogo en móvil.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Bandeja MUST ofrecer una opción explícita “Asignados a mí” y una
  opción para volver a todos los responsables.
- **FR-002**: El filtro personal MUST identificar al miembro de la sesión activa
  dentro de su empresa, no por nombre ni correo.
- **FR-003**: El filtro personal MUST combinarse con búsqueda, etapa, pestaña de
  estado y archivado sin ampliar resultados.
- **FR-004**: Cada conversación MUST mostrar de forma legible su responsable o
  “Sin asignar”.
- **FR-005**: Un miembro autenticado con acceso a Bandeja MUST poder iniciar la
  transferencia de una conversación individual desde la lista o el chat abierto.
- **FR-006**: La selección de destino MUST incluir únicamente miembros activos de
  la empresa actual y la opción “Sin asignar”.
- **FR-007**: La transferencia MUST cambiar el responsable del prospecto asociado
  sin crear una conversación, contacto o historial nuevo.
- **FR-008**: La transferencia MUST conservar el identificador de conversación,
  todos los mensajes y archivos, su orden, estados de entrega, notas, etapa,
  servicio, estado de IA, bloqueo, anclado, archivado y no leídos.
- **FR-009**: Si la conversación aún no tiene prospecto, el sistema MUST crear o
  recuperar uno dentro de la misma empresa antes de asignarlo.
- **FR-010**: Toda lectura y escritura MUST quedar limitada a la empresa de la
  sesión; un miembro ajeno o un chat ajeno MUST rechazarse sin revelar existencia.
- **FR-011**: Transferir al responsable actual MUST ser idempotente y no crear una
  notificación duplicada.
- **FR-012**: Una transferencia efectiva a otra persona MUST crear una
  notificación interna para el destinatario con enlace directo al chat.
- **FR-013**: El cambio de responsable MUST propagarse a las sesiones conectadas
  para actualizar listas, filtro personal, insignias y ficha sin recarga manual.
- **FR-014**: Si falla la notificación, la transferencia MUST permanecer aplicada
  y el fallo secundario no debe colgar ni revertir la operación.
- **FR-015**: La interfaz MUST informar claramente éxito, falta de conexión,
  destino inválido y conversación inexistente, y bloquear confirmaciones dobles.
- **FR-016**: La experiencia MUST ser operable con teclado y sin desbordamiento a
  375, 768 y 1440 píxeles.
- **FR-017**: La función MUST conservar el comportamiento existente de mensajes,
  IA, moderación, archivado, anclado, campañas y seguimiento.

### Key Entities

- **Conversación**: Hilo único de atención con sus mensajes, estado y contacto;
  no cambia de identidad durante una transferencia.
- **Prospecto**: Registro comercial asociado al contacto que conserva servicio,
  etapa y miembro responsable.
- **Miembro del equipo**: Usuario activo de una empresa que puede ser responsable
  y destinatario de una transferencia.
- **Notificación**: Alerta interna dirigida al nuevo responsable y enlazada a la
  conversación transferida.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un miembro puede activar el filtro personal y obtener una lista con
  100% de chats propios y 0 chats ajenos en menos de dos segundos.
- **SC-002**: Un usuario puede completar una transferencia válida en menos de 30
  segundos y cuatro interacciones desde un chat abierto.
- **SC-003**: El 100% de las transferencias conserva exactamente la cantidad,
  identidad, orden y contenido del historial previo.
- **SC-004**: El nuevo responsable ve el chat en su cola personal y recibe la
  alerta enlazada en menos de dos segundos bajo conexión normal.
- **SC-005**: El 100% de intentos con miembro o conversación de otra empresa es
  rechazado sin cambios ni exposición de datos.
- **SC-006**: Todos los flujos existentes relevantes continúan aprobando sus
  pruebas después de incorporar asignación y transferencia.

## Assumptions

- “Asignados a mí” es un filtro voluntario; los roles actuales conservan la vista
  completa de Bandeja al desactivarlo.
- Cualquier rol con acceso actual a Bandeja puede transferir a cualquier miembro
  activo de su empresa, porque todos esos roles pueden atender conversaciones.
- La opción “Sin asignar” es necesaria para corregir o devolver una conversación
  a la cola general.
- La asignación pertenece al prospecto y se comparte con Bandeja, Contactos y
  Etapas del prospecto; no se crea una propiedad paralela exclusiva del chat.
- No se solicita transferencia masiva en esta versión.
- No se añade una integración externa: se reutilizan equipo, notificaciones y
  actualización en vivo ya disponibles.
