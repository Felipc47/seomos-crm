# Feature Specification: SMS con Brevo para EE. UU.

**Created**: 2026-10-21
**Status**: En curso — teléfono verificado; conexión API y registro del remitente pendientes
**Input**: Integrar Brevo desde la creación de cuenta con ceo@seomos.com para
avisos y campañas SMS a EE. UU.; registro con Google; remitente de empresa cliente.

## User Scenarios & Testing

### User Story 1 — Conectar la cuenta de la empresa (P1)

Como administrador, quiero conectar Brevo a mi empresa y conocer qué falta para
poder enviar SMS a EE. UU.

**Independent Test**: Conectar una cuenta de prueba, consultar su estado desde
Configuración y comprobar que otro tenant no ve ni usa sus credenciales.

**Acceptance Scenarios**:

1. Sin conexión o remitente autorizado, los envíos permanecen bloqueados y el
   administrador ve el requisito pendiente.
2. Al guardar la conexión, ninguna respuesta devuelve la clave completa.
3. Un usuario sin permisos de administración no puede modificar la conexión.

### User Story 2 — Enviar un aviso a un contacto (P1)

Como usuario autorizado, quiero enviar un aviso SMS a un contacto de EE. UU. con
consentimiento y consultar su resultado en el CRM.

**Independent Test**: Desde la interfaz, registrar consentimiento con evidencia,
revisar el mensaje, confirmar y observar aceptación y posterior entrega simulada.

**Acceptance Scenarios**:

1. Sin consentimiento SMS, con baja vigente o con país diferente de US, se
   rechaza el envío antes de contactar al proveedor.
2. La aceptación del proveedor se distingue de entrega confirmada.
3. Un timeout no provoca reenvío ciego; se muestra incertidumbre de entrega.
4. Dos confirmaciones de la misma operación no generan dos SMS.

### User Story 3 — Operar campañas SMS (P2)

Como usuario autorizado, quiero preparar campañas para destinatarios elegibles,
revisar el contenido y su alcance, y consultar entregas y bajas.

**Independent Test**: Crear una campaña con destinatarios elegibles e inelegibles,
revisar exclusiones y segmentos, confirmar y observar el avance sin duplicados.

**Acceptance Scenarios**:

1. La revisión explica destinatarios incluidos y excluidos antes del envío.
2. Una baja recibida antes de despachar excluye al destinatario pendiente.
3. El contenido identifica la marca y ofrece la baja requerida para marketing.
4. Una campaña no se despacha fuera del horario aplicable al destinatario.
5. El fallo del proveedor conserva la campaña y permite conocer su resultado.

### Edge Cases

- Número +1 de un país distinto de Estados Unidos.
- Remitente registrado pero todavía pendiente de aprobación.
- Créditos insuficientes, credencial inválida, rate limit o proveedor inaccesible.
- Evento repetido, fuera de orden o recibido antes de persistir la aceptación.
- Aceptación por el proveedor seguida de timeout de nuestra solicitud.
- Unicode, emojis y mensajes de varios segmentos.
- Aviso con contenido que Brevo reclasifica como marketing por incluir STOP.
- Campaña con huso horario desconocido o destinatarios sin evidencia de opt-in.

## Requirements

### Functional Requirements

- **FR-001**: Conexión, remitente, contactos elegibles, campañas y eventos deben
  quedar aislados por empresa.
- **FR-002**: Solo administradores pueden gestionar la conexión y el remitente.
- **FR-003**: Guardar consentimiento SMS con fecha, fuente y evidencia; una baja
  SMS debe impedir futuros envíos sin alterar preferencias de otros canales.
- **FR-004**: Validar destinatarios de Estados Unidos y requisitos de envío antes
  de confirmar operaciones.
- **FR-005**: Ofrecer avisos y campañas, con revisión de destinatarios, contenido,
  marca y segmentos antes del envío.
- **FR-006**: Distinguir pendiente, aceptado, entregado, fallido e incierto y
  conservar el historial sin duplicar efectos ante reintentos o callbacks.
- **FR-007**: Aislar fallos de SMS de las demás funciones del CRM.
- **FR-008**: Las pruebas deben simular envíos sin usar créditos o contactos reales.
- **FR-009**: No dar por completada la integración real hasta verificar un envío
  autorizado con el remitente aprobado y observar su resultado.

### Key Entities

- Conexión SMS de empresa: cuenta Brevo, credencial protegida y remitente.
- Consentimiento SMS: destinatario, finalidad, fuente, evidencia, alta y baja.
- Mensaje SMS: contenido confirmado, destinatario, tipo, segmentos y estado.
- Campaña SMS: audiencia, contenido, programación y progreso.
- Evento SMS: relación con mensaje, resultado, fecha y deduplicación.

## Success Criteria

- **SC-001**: Ninguna prueba permite acceder a datos o credenciales de otra empresa.
- **SC-002**: Todos los casos sin consentimiento, con baja o sin remitente aprobado
  se bloquean antes del proveedor.
- **SC-003**: Doble clic y eventos duplicados no producen mensajes duplicados.
- **SC-004**: El usuario distingue aceptación, entrega y resultado incierto.
- **SC-005**: Flujo completo y degradación ante fallos pasan pruebas conducidas
  por el implementador antes de reportar entrega.

## Assumptions and Open Decisions

- El pedido autoriza Brevo exclusivamente para SMS; Resend permanece en email.
- Empresa remitente actual: **SEOMOS LLC**, confirmada por el dueño el 2026-10-26
  (reemplaza Lion Data para esta activación). Sitio: https://www.seomos.com/. Los datos del registro requieren
  confirmación del responsable antes de enviarlos a Brevo.
- Alcance confirmado: avisos y campañas a contactos con consentimiento.
- No se presupone autorización para comprar créditos ni iniciar campañas reales.
- Registro y aprobación del número son dependencias externas; no se confunden
  con validación local del CRM.
- Las automatizaciones específicas de avisos se detallarán con los casos de uso
  reales del cliente; no se activan disparadores automáticos por defecto.
- El registro de la cuenta fue completado y el teléfono verificado el
  2026-10-26. La sesión de ceo@seomos.com se verificó en el perfil corporativo.
- El formulario de SEOMOS revisado el 2026-10-26 incluye consentimiento
  WhatsApp, pero no SMS. No
  convertir los contactos actuales del CRM en suscriptores SMS por defecto.


## Observación inicial — 2026-10-26, antes de verificación del titular

Pedido actual: activar integración Brevo SMS usando la sesión ceo@seomos.com.
Sesión y cuenta SEOMOS verificadas en Chrome corporativo. Brevo muestra teléfono
sin verificar y 0 créditos SMS. El wizard Transactional SMS queda en Verification,
Waiting for log; It works! está deshabilitado. La verificación de teléfono es
necesaria incluso para crear una API key, según el modal mostrado. Se dejó
abierto para el titular y se solicitó completarla mientras continúa preparación.
No se presupone autorización de compras, envío real o contactos de prueba.

## Entrega incremental ante dependencia de registro

El teléfono fue verificado por el titular. No hay API keys ni solicitudes Sender ID.
Mientras se recopila el registro de SEOMOS LLC, implementar la conexión API cifrada
por empresa, verificación de cuenta y saldo, con estado explícito de envíos no
habilitados. La conexión API no equivale a aprobación regulatoria ni a entrega.
Las historias de avisos/campañas continúan pendientes; ningún endpoint de envío
real se habilita en esta primera parte. No se modifica el sitio corporativo ni
se inventa evidencia de consentimiento para obtener la aprobación.
