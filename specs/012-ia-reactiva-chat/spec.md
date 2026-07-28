# Feature Specification: IA reactiva desde el chat

**Feature Branch**: `codex/012-ia-reactiva-chat`

**Created**: 2026-07-27

**Status**: Implemented and verified

**Input**: Permitir encender o pausar la IA desde el encabezado de la
conversación y, al reactivarla, atender de inmediato el último mensaje entrante
que todavía no tenga respuesta.

## User Scenarios & Testing

### User Story 1 - Controlar la IA sin abandonar el chat (Priority: P1)

Como operador quiero ver y cambiar el estado de la IA desde el encabezado del
chat para tomar o devolver la conversación sin abrir el panel de detalles.

**Independent Test**: Abrir una conversación en Bandeja y alternar la IA desde
el encabezado; comprobar que el estado cambia, se refleja también en Ver
detalles y permanece después de recargar.

**Acceptance Scenarios**:

1. **Given** una conversación seleccionada, **When** se muestra el encabezado,
   **Then** el operador ve si la IA está activa o pausada y puede alternarla.
2. **Given** la IA activa, **When** el operador la apaga, **Then** la
   conversación queda pausada sin cambiar de pantalla.
3. **Given** una conversación en atención humana, **When** el operador enciende
   la IA, **Then** se limpia el handoff y ambos controles muestran el estado
   activo.
4. **Given** el proveedor sin configurar o el agente global apagado, **When** se
   abre el chat, **Then** el control informa que no está disponible y no simula
   una activación.

---

### User Story 2 - Responder el mensaje pendiente al reactivar (Priority: P1)

Como operador quiero que la IA responda el último mensaje pendiente apenas la
reactivo para no obligar al cliente a escribir de nuevo.

**Independent Test**: Pausar una conversación, recibir un mensaje entrante y
reactivar la IA; comprobar que aparece una única respuesta saliente sin enviar
otro mensaje del cliente.

**Acceptance Scenarios**:

1. **Given** IA pausada, ventana abierta y último mensaje entrante sin respuesta,
   **When** el operador la reactiva, **Then** el agente procesa ese mensaje de
   inmediato y envía una respuesta.
2. **Given** el mismo caso, **When** se repite la reactivación o dos solicitudes
   llegan casi juntas, **Then** se conserva una sola respuesta.
3. **Given** que existe un mensaje saliente posterior al último entrante,
   **When** se reactiva la IA, **Then** no se genera una respuesta duplicada.
4. **Given** que no existe ningún mensaje entrante, **When** se activa la IA,
   **Then** queda lista para el futuro sin enviar nada.

---

### User Story 3 - Mantener los guardrails de WhatsApp y handoff (Priority: P1)

Como responsable de la cuenta quiero que reactivar la IA respete las reglas de
WhatsApp y las solicitudes explícitas de atención humana.

**Independent Test**: Reactivar conversaciones con ventana cerrada y con una
petición de humano; comprobar que no se envía texto libre ni se ignora la
intención del cliente.

**Acceptance Scenarios**:

1. **Given** un entrante pendiente con más de 24 horas, **When** se reactiva la
   IA, **Then** no se envía texto libre y el control queda listo para un futuro
   entrante.
2. **Given** que el último entrante pide hablar con una persona, **When** se
   reactiva la IA, **Then** el pipeline conserva el handoff de cliente y no
   responde como si la petición no existiera.
3. **Given** un fallo del proveedor durante el turno reactivado, **When** el
   proceso termina, **Then** la interfaz no queda bloqueada y el pipeline
   conserva su degradación segura.

### Edge Cases

- Cambiar de conversación mientras se guarda no debe aplicar el estado visual
  del chat anterior al nuevo.
- El control debe caber en el encabezado móvil junto a volver y detalles.
- Un evento SSE o una recarga debe reconciliar el estado local con el servidor.
- La ventana se calcula con el timestamp de base de datos, no con una copia del
  estado de interfaz.
- Un turno ya en ejecución se coalesce; una reactivación concurrente se
  revalida al terminar y no duplica la salida.

## Requirements

### Functional Requirements

- **FR-001**: El encabezado de una conversación MUST mostrar un control de IA
  accesible sin abrir Ver detalles.
- **FR-002**: El control MUST distinguir activa, pausada, actualizando y agente
  no disponible.
- **FR-003**: El encabezado y el panel de detalles MUST usar el mismo contrato y
  reflejar el mismo estado efectivo.
- **FR-004**: Encender desde cualquier control MUST limpiar un handoff previo y
  habilitar `aiEnabled`.
- **FR-005**: Apagar MUST establecer `aiEnabled=false` sin alterar mensajes,
  contacto, lead o etapa.
- **FR-006**: Una activación MUST buscar un mensaje pendiente solo después de
  persistir el nuevo estado.
- **FR-007**: Un turno inmediato MUST encolarse únicamente cuando el agente
  global está listo, no hay handoff, la ventana está abierta y el último
  mensaje es entrante.
- **FR-008**: La decisión MUST revalidarse dentro del pipeline antes de enviar.
- **FR-009**: Si el último mensaje es saliente, no hay historial o la ventana
  está cerrada, la activación MUST NOT producir un envío.
- **FR-010**: Solicitudes repetidas o concurrentes MUST NOT producir respuestas
  duplicadas en el proceso soportado.
- **FR-011**: La activación MUST responder rápido al navegador y ejecutar el
  turno en segundo plano.
- **FR-012**: La interfaz MUST informar éxito, turno pendiente o error de red
  sin obligar a recargar.
- **FR-013**: El estado global expuesto a Bandeja MUST limitarse a disponibilidad
  y no revelar instrucciones ni secretos del agente.
- **FR-014**: Toda lectura y escritura MUST respetar el aislamiento por
  organización.
- **FR-015**: El control MUST ser operable con teclado, tener nombre accesible y
  funcionar sin desbordamiento a 375 píxeles.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El estado de IA se cambia desde Bandeja en un máximo de una acción,
  sin abrir otro panel.
- **SC-002**: El 100% de los entrantes pendientes con ventana abierta probados
  recibe una única respuesta después de reactivar, sin nueva interacción.
- **SC-003**: El 100% de los casos ya atendidos, vacíos o fuera de ventana
  produce cero mensajes nuevos.
- **SC-004**: Encabezado, panel de detalles y servidor coinciden después de cada
  cambio y tras recargar.
- **SC-005**: El flujo es utilizable a 375, 768 y 1440 píxeles y por teclado.
- **SC-006**: Typecheck, lint, build, unit tests, E2E feliz e infeliz y regresión
  del agente quedan verdes.

## Assumptions

- “Responder al reactivar” significa atender un entrante todavía pendiente
  dentro de la ventana de servicio, no iniciar una conversación de oficio.
- La petición explícita de hablar con una persona sigue teniendo prioridad
  sobre una reactivación accidental.
- El despliegue actual ejecuta el agente in-process y conserva su coalescing por
  conversación.

## Out of Scope

- Enviar plantillas automáticamente cuando la ventana está cerrada.
- Cambiar el toggle global o la configuración del agente desde Bandeja.
- Introducir colas externas o coordinación entre múltiples réplicas.
- Resumir masivamente todas las conversaciones pausadas.
