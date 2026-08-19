# Feature Specification: Créditos de IA por empresa

**Feature Branch**: `025-ai-credits`

**Created**: 2026-08-19

**Status**: Complete

**Input**: User description: "Poner un límite por créditos fácil de cotizar y revender, evitando consumos problemáticos de IA."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Limitar el consumo por empresa (Priority: P1)

Como superadministrador que revende Seomos, quiero asignar una bolsa de créditos independiente a cada empresa para conocer de antemano el máximo de intervenciones de IA que puede consumir.

**Why this priority**: Sin un límite duro por tenant, un cliente puede generar consumo abierto y volver impredecible el margen de reventa.

**Independent Test**: Se asignan créditos a una empresa, se reciben mensajes reales y se comprueba que cada intervención completa descuenta exactamente un crédito, sin afectar el saldo de otra empresa.

**Acceptance Scenarios**:

1. **Given** una empresa con 2 créditos y el agente activo, **When** llegan dos mensajes de clientes que producen dos intervenciones independientes, **Then** el agente responde y el saldo queda en 0.
2. **Given** una intervención cuyo proveedor reintenta o que además actualiza el perfil del lead, **When** termina el procesamiento, **Then** se descuenta un único crédito.
3. **Given** dos empresas con saldos diferentes, **When** una consume IA, **Then** solo cambia el saldo de esa empresa.
4. **Given** la misma intervención procesada de nuevo por recuperación o concurrencia, **When** se reserva el crédito, **Then** no se descuenta por segunda vez.

---

### User Story 2 - Recargar y consultar el saldo (Priority: P1)

Como superadministrador, quiero ver y recargar créditos desde Empresas para entregar paquetes comerciales sin depender de facturación automática ni editar la base de datos.

**Why this priority**: La operación comercial debe ser sencilla y compatible con una instalación self-hosted, sin introducir Stripe ni planes centralizados.

**Independent Test**: Desde Empresas se recarga una cantidad entera positiva y el nuevo saldo aparece tanto en la tarjeta de la empresa como en la configuración de su agente.

**Acceptance Scenarios**:

1. **Given** una empresa con saldo conocido, **When** el superadministrador agrega 500 créditos, **Then** el saldo aumenta exactamente en 500 y queda un registro auditable.
2. **Given** un usuario de la empresa, **When** abre la página del Agente, **Then** puede consultar el saldo restante y entender qué consume un crédito.
3. **Given** un administrador que no es superadministrador, **When** intenta recargar saldo mediante la API, **Then** la operación es rechazada.

---

### User Story 3 - Degradar con seguridad al agotarse (Priority: P1)

Como operador del negocio, quiero que al agotarse el saldo el sistema detenga las llamadas de IA y entregue la conversación a una persona, para no generar costos fuera del paquete vendido ni dejar el flujo colgado.

**Why this priority**: El límite solo protege el margen si se aplica antes de llamar al proveedor y deja un estado operativo claro.

**Independent Test**: Con saldo cero se recibe un mensaje nuevo y se verifica que no se llama al mock de IA, no se envía una respuesta automática y la conversación queda marcada para atención humana por créditos agotados.

**Acceptance Scenarios**:

1. **Given** una empresa sin créditos, **When** llega un mensaje real, **Then** no se invoca al proveedor LLM y la conversación queda en handoff con motivo "créditos agotados".
2. **Given** una conversación pausada por créditos, **When** se recarga la empresa, **Then** el saldo queda disponible pero la conversación conserva el handoff hasta que un operador la reactive conscientemente.
---

### User Story 4 - Costear seguimientos (Priority: P2)

Como revendedor, quiero que las demás funciones que llaman a la IA tengan precios fijos y visibles para que la cotización no dependa de detalles técnicos.

**Why this priority**: El agente principal concentra el uso, pero los seguimientos contextuales también consumen proveedor y deben respetar el mismo techo.

**Independent Test**: Un seguimiento contextual descuenta 1 crédito; con saldo insuficiente no inicia una llamada LLM.

**Acceptance Scenarios**:

1. **Given** una ventana de WhatsApp abierta y un seguimiento pendiente, **When** se genera texto contextual con IA, **Then** se descuenta 1 crédito.
2. **Given** una ventana cerrada que usa una plantilla aprobada sin IA, **When** se envía el seguimiento, **Then** no se descuenta crédito.

---

### User Story 5 - Retirar el Laboratorio (Priority: P1)

Como dueño del producto, quiero retirar la función de Laboratorio para que no consuma IA, no se venda por error y no quede accesible mediante APIs internas.

**Independent Test**: Las rutas `/api/lab/*` responden 404, no existe código ejecutable del runner/juez y la interfaz de créditos no menciona corridas ni un costo de 25 créditos.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado o anónimo, **When** solicita cualquier ruta histórica bajo `/api/lab/*`, **Then** recibe 404 y no se crea trabajo ni se invoca el proveedor.
2. **Given** un usuario en la página Agente, **When** consulta su saldo, **Then** solo ve los costos de intervención completa y seguimiento con IA.
3. **Given** una instalación con datos históricos `is_test`, **When** procesa envíos, **Then** el guardarraíl sigue prohibiendo tocar WhatsApp real.

### Edge Cases

- Dos procesos intentan consumir simultáneamente el último crédito: solo uno obtiene saldo y el balance nunca queda negativo.
- Un webhook o barrido vuelve a procesar la misma intervención: la clave de referencia evita el doble cobro.
- El proveedor falla después de reservar el crédito: el crédito se considera consumido porque hubo un intento facturable; sus reintentos internos quedan incluidos.
- Una empresa cliente creada por el superadministrador inicia en 0 créditos y no puede usar IA hasta recibir una recarga explícita; la organización fundadora de una instalación limpia recibe 1.000 para demo y puesta en marcha.
- Las organizaciones existentes reciben una bolsa de transición de 1.000 créditos en la migración para evitar una interrupción inesperada al desplegar.
- Los créditos no caducan ni se renuevan automáticamente; el superadministrador controla las recargas según su acuerdo comercial.
- Los mensajes agrupados por la ventana actual de coalescencia forman una sola intervención y consumen un crédito.
- Audio, visión, actualización del perfil del lead y acciones ejecutadas dentro de la misma intervención quedan incluidos en su único crédito.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mantener un saldo entero no negativo e independiente por organización.
- **FR-002**: El sistema MUST registrar cada recarga y consumo en un libro auditable con organización, cantidad, tipo, referencia idempotente, actor cuando aplique y fecha.
- **FR-003**: El superadministrador MUST poder consultar y agregar una cantidad entera positiva de créditos a cualquier empresa activa.
- **FR-004**: Usuarios que no sean superadministradores MUST NOT poder modificar créditos.
- **FR-005**: Una intervención real del agente MUST reservar 1 crédito antes de cualquier llamada LLM asociada y MUST incluir respuesta, medios, reintentos técnicos, acciones y perfilado del lead sin cobros adicionales.
- **FR-006**: El sistema MUST usar una referencia única de intervención para impedir cobros duplicados ante reintentos, webhooks duplicados o concurrencia.
- **FR-007**: Un seguimiento contextual generado con IA MUST consumir 1 crédito; un seguimiento con plantilla sin IA MUST consumir 0.
- **FR-009**: Si no existe saldo suficiente, el sistema MUST impedir la llamada LLM antes de realizarla.
- **FR-010**: Cuando una intervención real no tenga saldo, la conversación MUST pasar a atención humana con el motivo visible "créditos agotados" y MUST NOT enviar una respuesta automática.
- **FR-011**: Cuando un seguimiento no tenga saldo, MUST omitirse sin invocar el LLM y MUST dejarse una nota operativa auditable.
- **FR-013**: El saldo MUST mostrarse en Empresas al superadministrador y en la página Agente a usuarios autorizados de la propia organización.
- **FR-014**: La interfaz MUST explicar en lenguaje comercial la unidad: 1 crédito por intervención completa y 1 por seguimiento con IA.
- **FR-015**: Las operaciones de saldo MUST ser atómicas; ninguna condición de carrera puede producir saldo negativo.
- **FR-016**: Las empresas cliente creadas por el superadministrador MUST iniciar con saldo 0; la organización fundadora de una instalación limpia y las organizaciones existentes al migrar MUST recibir 1.000 créditos de puesta en marcha/transición.
- **FR-017**: Los créditos MUST ser una bolsa recargable sin vencimiento, renovación automática, planes ni integración de pagos.
- **FR-018**: El Laboratorio MUST permanecer retirado: no debe existir UI, API ni código de ejecución; los guardarraíles `is_test` históricos MUST conservarse.

### Key Entities

- **Cuenta de créditos IA**: Saldo agregado de una organización, con totales históricos concedidos y consumidos.
- **Movimiento de créditos IA**: Entrada auditable e idempotente que representa una recarga o un consumo y pertenece obligatoriamente a una organización.
- **Intervención IA**: Unidad comercial correspondiente al procesamiento agrupado de uno o más mensajes entrantes hasta producir una decisión/respuesta del agente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de llamadas LLM del agente y seguimiento tienen una reserva de créditos previa.
- **SC-002**: Bajo 20 intentos concurrentes con un saldo de 1, exactamente uno puede consumir y el saldo final es 0.
- **SC-003**: Reprocesar 10 veces la misma referencia de intervención descuenta exactamente 1 crédito.
- **SC-004**: Un superadministrador puede consultar y recargar una empresa en menos de 30 segundos desde Empresas.
- **SC-005**: Con saldo 0, una intervención real realiza 0 llamadas al proveedor y queda visible para atención humana en menos de 10 segundos.
- **SC-007**: El gate técnico y el self-test E2E de camino feliz e insuficiencia terminan en verde.
- **SC-008**: El 100% de rutas históricas `/api/lab/*` verificadas responde 404 y realiza 0 llamadas al proveedor.

## Assumptions

- "Turno" se reemplaza en la interfaz por "intervención completa" para evitar confundir mensajes del cliente, respuestas y llamadas internas.
- La bolsa se recarga manualmente cuando el cliente compra o renueva; esta feature no calcula precios en dinero ni procesa pagos.
- El revendedor incorpora su margen al precio por crédito; Seomos controla unidades de uso, no la moneda ni la tarifa comercial.
- Los consumos ya iniciados no se reembolsan automáticamente si el proveedor falla, porque el proveedor puede haber facturado tokens aunque no entregue una respuesta válida.
- La reactivación tras un handoff por saldo agotado sigue siendo una acción humana explícita para evitar respuestas tardías no deseadas.
