# Feature Specification: Asignación de servicios a ejecutivos comerciales

**Feature Branch**: `codex/013-asignacion-servicios-ejecutivos`

**Created**: 2026-07-28

**Status**: Draft

**Input**: El administrador necesita asociar cada servicio del negocio a un
ejecutivo comercial para que los prospectos que llegan por ese servicio queden
asignados al asesor responsable.

## User Scenarios & Testing

### User Story 1 - Configurar responsables por servicio (Priority: P1)

Como administrador de la empresa, quiero seleccionar un ejecutivo comercial
responsable para cada servicio, de modo que la distribución del equipo quede
definida en un solo lugar y sea fácil de mantener.

**Why this priority**: Sin una relación explícita entre servicio y ejecutivo no
existe una regla confiable para distribuir prospectos.

**Independent Test**: Un administrador crea dos servicios, asigna cada uno a un
ejecutivo distinto y vuelve a cargar la pantalla; ambas asignaciones permanecen
y cada ejecutivo muestra los servicios que tiene a cargo.

**Acceptance Scenarios**:

1. **Given** una empresa con servicios y ejecutivos comerciales, **When** el
   administrador selecciona un ejecutivo en un servicio, **Then** la asignación
   se guarda y se confirma visualmente.
2. **Given** un ejecutivo responsable de varios servicios, **When** el
   administrador consulta la sección de equipo, **Then** puede reconocer los
   servicios asociados a ese ejecutivo.
3. **Given** un servicio sin responsable, **When** el administrador abre la
   configuración, **Then** lo ve identificado como “Sin asignar” y puede
   corregirlo.
4. **Given** un usuario que no es administrador, **When** intenta cambiar la
   asignación, **Then** el sistema rechaza el cambio sin alterar datos.

---

### User Story 2 - Enrutar automáticamente nuevos prospectos (Priority: P1)

Como ejecutivo comercial, quiero que un prospecto entrante por uno de mis
servicios quede asignado a mí y me genere una notificación, para atenderlo sin
depender de una distribución manual.

**Why this priority**: Es el resultado operativo que da valor a la
configuración; la asignación no puede ser solamente decorativa.

**Independent Test**: Se vincula un formulario a un servicio con responsable y
se simula un nuevo prospecto de ese formulario; el prospecto conserva servicio
y ejecutivo, aparece así en las superficies comerciales y el ejecutivo recibe
una sola notificación navegable.

**Acceptance Scenarios**:

1. **Given** un formulario vinculado a un servicio con responsable, **When**
   llega un prospecto nuevo desde ese formulario, **Then** el prospecto queda
   asociado al servicio y al ejecutivo configurado.
2. **Given** el mismo ingreso, **When** finaliza el procesamiento, **Then** el
   ejecutivo recibe una notificación que identifica prospecto y servicio y
   permite abrir su conversación.
3. **Given** un reintento del mismo evento externo, **When** se procesa de
   nuevo, **Then** no se crea otra asignación, notificación ni efecto visible.
4. **Given** un servicio sin responsable, **When** llega un prospecto por uno
   de sus formularios, **Then** conserva el servicio, queda “Sin asignar” y el
   ingreso continúa normalmente sin notificación personal.
5. **Given** un contacto existente que completa un nuevo formulario, **When**
   el evento es nuevo, **Then** su prospecto activo refleja el servicio y
   responsable vigentes para esa nueva oportunidad.

---

### User Story 3 - Reconocer responsable en la operación diaria (Priority: P2)

Como miembro del equipo, quiero ver el servicio y ejecutivo asignados al
prospecto en Bandeja, Etapas del prospecto y Contactos, para saber quién debe
atenderlo sin abrir configuraciones.

**Why this priority**: La asignación solo es útil si resulta visible en las
pantallas donde el equipo trabaja.

**Independent Test**: Con un prospecto asignado, las tres superficies muestran
el mismo servicio y ejecutivo; con uno sin responsable muestran “Sin asignar”
sin errores ni datos de otra empresa.

**Acceptance Scenarios**:

1. **Given** un prospecto asignado, **When** un miembro de la empresa consulta
   Bandeja, Etapas del prospecto o Contactos, **Then** reconoce el mismo
   servicio y ejecutivo en todas ellas.
2. **Given** un prospecto cuyo servicio no tiene ejecutivo, **When** se muestra
   en esas superficies, **Then** aparece como “Sin asignar”.
3. **Given** organizaciones distintas, **When** sus usuarios consultan o
   modifican datos, **Then** nunca ven ni pueden seleccionar servicios,
   ejecutivos o prospectos de otra organización.

---

### User Story 4 - Enrutar conversaciones iniciadas por el cliente (Priority: P1)

Como administrador, quiero que la IA identifique entre los servicios
configurados cuál corresponde a la necesidad expresada en WhatsApp y asigne el
prospecto a su ejecutivo, para que los contactos que escriben primero no queden
sin responsable por no venir de un formulario de Meta.

**Independent Test**: Con «Desarrollo web» asignado a una ejecutiva, un contacto
nuevo escribe que necesita una tienda virtual; después del turno de IA, la
Bandeja muestra ese servicio y esa ejecutiva y ella recibe una sola
notificación. Un mensaje ambiguo no se asigna a ciegas y el siguiente mensaje
con suficiente contexto completa la asignación.

**Acceptance Scenarios**:

1. **Given** una conversación directa sin servicio, **When** el historial
   identifica inequívocamente uno de los servicios configurados, **Then** la IA
   persiste ese servicio y copia su responsable vigente al prospecto.
2. **Given** un servicio detectado con responsable elegible, **When** se aplica
   por primera vez, **Then** el ejecutivo recibe una sola notificación
   navegable y la Bandeja se actualiza por SSE.
3. **Given** un mensaje insuficiente o un identificador inventado por el
   proveedor, **When** no existe coincidencia exacta con el catálogo de la
   organización, **Then** no se asigna a ciegas ni se bloquea la conversación.
4. **Given** un prospecto ya clasificado por Lead Ads, **When** la IA analiza la
   conversación, **Then** no reemplaza su servicio ni responsable histórico.
5. **Given** un prospecto transferido manualmente antes de clasificar el
   servicio, **When** la IA identifica el servicio, **Then** guarda el servicio
   pero conserva la transferencia humana.
6. **Given** audios o imágenes convertidos en contexto textual, **When** allí se
   evidencia la necesidad, **Then** participan en la misma clasificación.
7. **Given** una conversación nueva, **When** el cliente únicamente saluda,
   comparte su nombre o pide información de forma genérica, **Then** el
   prospecto permanece sin servicio y sin responsable aunque el proveedor
   devuelva prematuramente un `serviceId` válido.
8. **Given** una conversación todavía sin servicio, **When** el cliente expresa
   una necesidad concreta en el primer mensaje o después de una pregunta de
   calificación, **Then** esa evidencia permite clasificar y asignar sin exigir
   artificialmente un número mínimo de turnos.

### Edge Cases

- Si un ejecutivo cambia a un rol no comercial, deja de ser seleccionable y
  sus servicios actuales pasan a “Sin asignar”; los prospectos ya recibidos
  conservan el responsable histórico.
- Cambiar el responsable de un servicio afecta únicamente ingresos futuros;
  no reasigna silenciosamente prospectos ya distribuidos.
- Eliminar un servicio no elimina prospectos ni contactos; estos conservan el
  responsable histórico y el servicio deja de estar disponible para ingresos
  futuros.
- Eliminar un miembro deja sin responsable los servicios configurados y
  conserva los prospectos y conversaciones.
- Un identificador de ejecutivo inexistente, de otra empresa o con rol no
  comercial se rechaza.
- Si la notificación falla, el prospecto y su asignación permanecen guardados y
  el flujo de ingreso no se bloquea.
- La detección se reintenta en turnos posteriores mientras el prospecto siga
  sin servicio; una salida ambigua o inválida del LLM nunca elige por descarte.
- Una asignación manual tiene prioridad sobre el responsable automático del
  servicio. La IA puede completar el servicio faltante sin pisar al humano.
- Un saludo, nombre, agradecimiento, descripción general del negocio o pedido
  genérico de información no constituye intención de servicio. La evidencia
  debe provenir de una línea del cliente; una sugerencia del agente nunca basta.

## Requirements

### Functional Requirements

- **FR-001**: El sistema MUST permitir que un administrador asigne cero o un
  ejecutivo comercial responsable a cada servicio.
- **FR-002**: Un ejecutivo comercial MUST poder ser responsable de varios
  servicios.
- **FR-003**: La pantalla de Servicios MUST mostrar el responsable actual de
  cada servicio y un estado inequívoco para los que no tienen responsable.
- **FR-004**: La pantalla de Equipo MUST mostrar, al menos como resumen, los
  servicios asociados a cada ejecutivo comercial.
- **FR-005**: Solo administradores MUST poder crear o cambiar asignaciones de
  responsables.
- **FR-006**: El sistema MUST validar que servicio y ejecutivo pertenezcan a la
  organización activa y que el miembro tenga rol comercial.
- **FR-007**: Cuando llegue un evento nuevo de formulario vinculado, el sistema
  MUST copiar el servicio y su responsable vigente al prospecto.
- **FR-008**: El sistema MUST conservar el servicio aun cuando este no tenga
  responsable y marcar el prospecto como no asignado.
- **FR-009**: El ejecutivo asignado MUST recibir una notificación con nombre del
  prospecto, servicio y acceso a la conversación.
- **FR-010**: Un reintento del mismo evento externo MUST producir como máximo
  una asignación y una notificación.
- **FR-011**: Bandeja, Etapas del prospecto y Contactos MUST mostrar una
  representación consistente del servicio y responsable del prospecto.
- **FR-012**: Cambiar la configuración de un servicio MUST afectar ingresos
  futuros sin reasignar prospectos existentes.
- **FR-013**: Cambiar un ejecutivo a un rol no comercial MUST liberar sus
  servicios para evitar nuevos enrutamientos incorrectos.
- **FR-014**: Una falla al notificar MUST degradar sin revertir, duplicar ni
  bloquear el ingreso del prospecto.
- **FR-015**: La funcionalidad MUST reutilizar las dependencias existentes y no
  agregar servicios externos de runtime.
- **FR-016**: El contexto del agente MUST incluir el catálogo de servicios de la
  organización y pedir una pregunta de calificación cuando aún no sea posible
  distinguirlos.
- **FR-017**: La pasada de enriquecimiento posterior al turno MUST devolver
  cero o un identificador exacto del catálogo y resolverlo contra una allowlist
  tenant-safe antes de persistirlo.
- **FR-018**: La detección directa MUST escribir servicio y responsable solo
  mientras el prospecto no tenga servicio, preservando asignaciones manuales y
  atribuciones previas de Lead Ads.
- **FR-019**: La primera asignación automática por IA MUST publicar la
  actualización y notificar una sola vez al ejecutivo elegible.
- **FR-020**: Un fallo, salida ambigua o servicio inexistente del proveedor MUST
  degradar sin asignación incorrecta y permitir reintentar en otro turno.
- **FR-021**: Toda clasificación directa MUST incluir una evidencia concreta de
  la necesidad del cliente y el servidor MUST comprobarla antes de persistir;
  un `serviceId` válido sin evidencia suficiente MUST ignorarse.
- **FR-022**: Saludos, identidad, cierres y solicitudes genéricas de información
  MUST permanecer sin servicio ni responsable hasta que aparezca una intención
  o necesidad comercial específica.
- **FR-023**: La validación MUST aceptar una necesidad explícita desde el primer
  mensaje y respuestas concretas a una pregunta de calificación, sin depender
  de un mínimo fijo de mensajes.

### Key Entities

- **Servicio**: Oferta del negocio vinculada a cero o más formularios y a cero
  o un ejecutivo comercial responsable.
- **Ejecutivo comercial**: Miembro de la organización elegible para recibir uno
  o varios servicios y sus nuevos prospectos.
- **Prospecto**: Oportunidad asociada a un contacto que conserva el servicio y
  responsable vigentes al momento de su ingreso.
- **Notificación de asignación**: Aviso único y navegable dirigido al ejecutivo
  cuando recibe un prospecto por uno de sus servicios.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un administrador puede asignar responsables a diez servicios en
  menos de tres minutos sin salir de la sección de Servicios.
- **SC-002**: El 100% de los prospectos de formularios vinculados queda
  asociado al responsable configurado o explícitamente marcado “Sin asignar”.
- **SC-003**: El ejecutivo ve la notificación y la asignación en la interfaz en
  menos de cinco segundos después de completar el ingreso.
- **SC-004**: Reprocesar diez veces el mismo evento produce exactamente una
  notificación y un único estado de asignación.
- **SC-005**: Los casos feliz, sin responsable, permiso insuficiente,
  organización ajena y fallo de notificación terminan sin bloquear la
  operación ni cruzar datos.
- **SC-006**: La configuración y los indicadores son utilizables sin
  desplazamiento horizontal en anchos de 375, 768 y 1440 píxeles.
- **SC-007**: Una conversación directa con necesidad inequívoca queda asociada
  al servicio y ejecutivo correctos antes de cinco segundos después del turno
  de IA, sin intervención manual.
- **SC-008**: Reanalizar diez veces un prospecto ya clasificado produce cero
  cambios de responsable y una sola notificación de asignación.
- **SC-009**: Una secuencia “Hola” → nombre → consulta genérica produce cero
  asignaciones incluso si el mock del proveedor intenta devolver un servicio;
  el siguiente mensaje con necesidad concreta produce exactamente una.

## Assumptions

- Se amplía la sección “Servicios” que ya existe en el panel izquierdo en lugar
  de crear una segunda opción duplicada.
- El formulario de Meta sigue siendo la fuente determinista y prioritaria. En
  conversaciones directas, la IA clasifica contra los servicios configurados;
  si aún no hay evidencia suficiente, pregunta y reintenta en el siguiente
  turno en vez de inventar una asignación.
- “Le llega al asesor” significa asignación persistente, visibilidad uniforme
  y notificación personal; no restringe la visibilidad del prospecto al resto
  del equipo.
- Cada servicio tiene como máximo un responsable a la vez; un ejecutivo puede
  administrar muchos servicios.
- Los prospectos conservan una copia de la asignación recibida para mantener
  trazabilidad aunque la configuración cambie.
