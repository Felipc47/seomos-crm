# Feature Specification: Gestión y moderación de chats en Bandeja

**Feature Branch**: `014-gestion-chats`

**Created**: 2026-08-02

**Status**: Draft

**Input**: El usuario necesita eliminar chats de forma individual o masiva
desde Bandeja, además de bloquear, desbloquear y reportar contactos.

## User Scenarios & Testing

### User Story 1 - Eliminar conversaciones (Priority: P1)

Como miembro del equipo, quiero eliminar una conversación individual o varias
conversaciones seleccionadas desde Bandeja para retirar historiales que ya no
deben permanecer visibles sin perder el contacto ni su prospecto comercial.

**Why this priority**: Es la necesidad explícita principal y debe funcionar de
forma segura para evitar pérdidas accidentales o eliminación de datos fuera del
alcance elegido.

**Independent Test**: Crear tres conversaciones con mensajes, eliminar una
desde su menú y dos mediante selección masiva; las conversaciones y sus
mensajes desaparecen, pero los contactos y prospectos permanecen. Un nuevo
mensaje entrante vuelve a crear una conversación para el contacto.

**Acceptance Scenarios**:

1. **Given** una conversación en Bandeja, **When** el usuario elige “Eliminar
   chat” y confirma, **Then** la conversación y su historial desaparecen de la
   Bandeja sin borrar el contacto ni el prospecto.
2. **Given** varias conversaciones visibles, **When** el usuario activa la
   selección, marca algunas y confirma “Eliminar”, **Then** solo las
   conversaciones seleccionadas son eliminadas.
3. **Given** una selección destructiva, **When** el usuario cancela la
   confirmación, **Then** no se modifica ninguna conversación.
4. **Given** un contacto cuyo chat fue eliminado, **When** llega un nuevo
   mensaje de WhatsApp, **Then** el sistema crea una conversación nueva y
   conserva el contacto y prospecto existentes.

---

### User Story 2 - Bloquear y desbloquear contactos (Priority: P1)

Como miembro del equipo, quiero bloquear un contacto desde su conversación
para detener de inmediato la IA, los mensajes manuales, las plantillas, los
seguimientos y las campañas dirigidas a ese número, y poder desbloquearlo de
forma segura cuando corresponda.

**Why this priority**: Un bloqueo que solo cambia la apariencia no protege al
negocio ni al contacto; la acción debe tener efecto real en todos los caminos
de salida.

**Independent Test**: Bloquear un contacto y comprobar que aparece marcado,
que todos los caminos de envío y la IA lo omiten y que el canal externo recibe
el bloqueo; simular un fallo externo y comprobar que el bloqueo local sigue
protegiendo. Desbloquear y confirmar que los envíos vuelven a estar disponibles.

**Acceptance Scenarios**:

1. **Given** un contacto activo, **When** el usuario confirma “Bloquear”,
   **Then** el contacto queda marcado como bloqueado, el canal recibe la orden
   y ningún flujo del CRM puede enviarle mensajes ni generar respuestas de IA.
2. **Given** una falla temporal del canal al bloquear, **When** el usuario
   ejecuta la acción, **Then** el bloqueo local se aplica de inmediato, el
   estado de sincronización queda visible y puede reintentarse sin enviar nada.
3. **Given** un contacto bloqueado, **When** el usuario intenta enviar texto,
   archivos o una plantilla, **Then** la interfaz y el servidor rechazan el
   envío con una explicación clara.
4. **Given** un contacto bloqueado, **When** el usuario confirma
   “Desbloquear” y el canal acepta la operación, **Then** el bloqueo local se
   retira y la conversación puede operar normalmente.
5. **Given** una falla del canal al desbloquear, **When** se intenta la acción,
   **Then** el contacto permanece bloqueado localmente para evitar una
   habilitación inconsistente.

---

### User Story 3 - Reportar contactos (Priority: P2)

Como miembro del equipo, quiero reportar una conversación individual o varias
seleccionadas con una razón y notas opcionales para dejar evidencia auditable
de spam, fraude, acoso u otro comportamiento inapropiado.

**Why this priority**: El reporte aporta trazabilidad operativa, pero es
independiente del bloqueo y no debe presentarse como una denuncia enviada a un
tercero cuando el canal no ofrece esa capacidad.

**Independent Test**: Reportar una conversación y un grupo con diferentes
motivos; el estado se muestra en Bandeja y conserva motivo, notas, usuario y
fecha dentro de la organización, sin bloquear automáticamente.

**Acceptance Scenarios**:

1. **Given** una conversación, **When** el usuario selecciona “Reportar”,
   elige un motivo y confirma, **Then** el reporte queda guardado con actor y
   fecha y la conversación muestra su estado.
2. **Given** varias conversaciones seleccionadas, **When** el usuario las
   reporta con un motivo común, **Then** cada contacto recibe un registro
   equivalente sin afectar conversaciones no seleccionadas.
3. **Given** un reporte, **When** se completa la acción, **Then** la interfaz
   aclara que es un reporte interno y no afirma haberlo enviado a Meta.
4. **Given** un contacto reportado pero no bloqueado, **When** continúa la
   operación, **Then** el reporte por sí solo no impide mensajes ni IA.

### Edge Cases

- Las acciones masivas aceptan como máximo 100 conversaciones por solicitud,
  rechazan listas vacías o mal formadas y deduplican IDs repetidos.
- Si una conversación fue eliminada por otro usuario mientras estaba
  seleccionada, el resto de la operación continúa y el resultado informa el
  número realmente afectado.
- Una conversación de laboratorio no se puede bloquear ni reportar como si
  fuera un contacto real de WhatsApp.
- El bloqueo se aplica al contacto, por lo que continúa vigente si su chat se
  elimina y luego se crea una conversación nueva.
- Eliminar un chat bloqueado no elimina el bloqueo ni el reporte del contacto.
- Ninguna operación puede leer o modificar conversaciones de otra
  organización, aunque conozca sus identificadores.
- Una respuesta tardía del canal no puede deshacer un bloqueo local ni habilitar
  un desbloqueo que el canal rechazó.
- Al cambiar filtros o salir del modo selección, la interfaz limpia selecciones
  que ya no son visibles para evitar acciones accidentales.

## Requirements

### Functional Requirements

- **FR-001**: El sistema MUST permitir eliminar una conversación individual
  desde su menú contextual con confirmación explícita.
- **FR-002**: El sistema MUST ofrecer un modo de selección en Bandeja para
  actuar sobre una o varias conversaciones visibles.
- **FR-003**: El sistema MUST permitir seleccionar o deseleccionar todas las
  conversaciones visibles y mostrar el total seleccionado.
- **FR-004**: Eliminar una conversación MUST eliminar su historial y conservar
  contacto, prospecto, atributos comerciales, bloqueo y reporte.
- **FR-005**: Un nuevo mensaje entrante MUST poder crear una conversación nueva
  para un contacto cuyo chat anterior fue eliminado.
- **FR-006**: El sistema MUST permitir bloquear y desbloquear de forma
  individual o masiva contactos de conversaciones reales.
- **FR-007**: Un contacto bloqueado MUST quedar excluido de respuestas de IA,
  mensajes manuales, archivos, plantillas, campañas y seguimientos automáticos.
- **FR-008**: El bloqueo local MUST aplicarse aunque falle la sincronización
  externa y MUST exponer un estado reintentable sin revelar secretos.
- **FR-009**: El desbloqueo local MUST ocurrir únicamente después de que la
  sincronización externa sea aceptada.
- **FR-010**: La interfaz MUST identificar contactos bloqueados y reemplazar el
  compositor por una explicación y una acción de desbloqueo.
- **FR-011**: El sistema MUST permitir reportar individual o masivamente con
  uno de los motivos: spam, acoso, fraude, contenido inapropiado u otro.
- **FR-012**: Cada reporte MUST conservar organización, contacto, motivo,
  notas opcionales, usuario y fecha.
- **FR-013**: Reportar MUST ser independiente de bloquear y MUST presentarse
  como una acción interna del CRM.
- **FR-014**: Todas las operaciones MUST validar la organización activa y
  limitar cada lote a 100 identificadores únicos.
- **FR-015**: Toda acción destructiva o de moderación MUST requerir
  confirmación y mostrar resultado o error accionable.
- **FR-016**: Las acciones MUST emitir actualización en tiempo real para que
  otras sesiones de la organización reflejen el cambio.
- **FR-017**: La función MUST reutilizar las dependencias permitidas y no
  introducir servicios externos nuevos.

### Key Entities

- **Conversación**: Contenedor eliminable del historial de mensajes de un
  contacto; no representa por sí mismo al contacto ni al prospecto.
- **Contacto bloqueado**: Estado persistente del destinatario que impide toda
  salida y registra el resultado de sincronización con el canal.
- **Reporte de contacto**: Evidencia interna con motivo, notas, actor y fecha,
  separada del bloqueo.
- **Selección de Bandeja**: Conjunto temporal y acotado de conversaciones
  visibles sobre las cuales se ejecuta una acción común.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un usuario puede eliminar un chat individual en menos de 20
  segundos y un lote de hasta 100 chats en menos de 45 segundos.
- **SC-002**: El 100% de los contactos bloqueados queda excluido de todos los
  caminos de salida y de la IA, incluso durante fallas del canal.
- **SC-003**: El 100% de los chats eliminados conserva su contacto y prospecto,
  y un mensaje posterior puede reabrir la conversación sin duplicarlos.
- **SC-004**: El 100% de los reportes conserva motivo, usuario y fecha y se
  mantiene aislado a su organización.
- **SC-005**: Los casos de cancelación, identificador ajeno, lote inválido,
  fallo al bloquear y fallo al desbloquear terminan sin pérdida accidental,
  cruce de datos ni envío no autorizado.
- **SC-006**: La selección y las acciones son utilizables sin desplazamiento
  horizontal en anchos de 375, 768 y 1440 píxeles.

## Assumptions

- “Eliminar chat” borra conversación e historial, pero conserva el contacto y
  el prospecto. “Eliminar contacto”, ya existente, continúa siendo la acción
  separada que elimina toda la ficha.
- La operación de reporte es interna y auditable. Meta ofrece bloqueo de
  usuarios para WhatsApp Cloud API, pero no una operación pública equivalente
  para reportar spam desde la cuenta del negocio.
- Reportar no bloquea automáticamente; el usuario puede ejecutar ambas
  acciones si lo necesita.
- Los miembros autenticados que ya pueden operar Bandeja pueden usar estas
  acciones; el aislamiento por organización sigue siendo obligatorio.
- La selección masiva actúa sobre las conversaciones que el usuario marcó, no
  sobre todos los resultados del servidor ni sobre páginas no cargadas.
