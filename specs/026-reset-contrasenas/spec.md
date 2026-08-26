# Feature Specification: Restablecimiento seguro de contraseñas

**Feature Branch**: `026-reset-contrasenas`

**Created**: 2026-08-26

**Status**: Ready for planning

**Input**: User description: "necesito tener la opción de que los admin puedan restablecer sus contraseñas y las de las personas de su equipo"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recuperar la propia cuenta (Priority: P1)

Una persona que olvidó su contraseña solicita desde el acceso un enlace personal para definir una nueva contraseña y volver a entrar al CRM.

**Why this priority**: Evita que un admin quede bloqueado fuera de la instancia y elimina la necesidad de compartir contraseñas por canales inseguros.

**Independent Test**: Con una cuenta existente, se solicita la recuperación, se abre el enlace recibido, se define una contraseña nueva y se comprueba que la anterior deja de funcionar y la nueva permite entrar.

**Acceptance Scenarios**:

1. **Given** una cuenta existente con contraseña, **When** la persona solicita recuperación y completa el enlace vigente con una contraseña válida, **Then** puede iniciar sesión con la nueva contraseña y no con la anterior.
2. **Given** un correo inexistente, **When** alguien solicita recuperación, **Then** recibe la misma confirmación neutra que para una cuenta existente y no puede deducir si el correo está registrado.
3. **Given** un enlace ya usado, vencido o alterado, **When** alguien intenta definir una contraseña, **Then** el sistema lo rechaza sin cambiar credenciales y ofrece solicitar uno nuevo.

---

### User Story 2 - Ayudar a un integrante del equipo (Priority: P1)

Un admin inicia el restablecimiento para una persona de su propia organización desde la pantalla de equipo; la persona recibe un enlace personal y el admin nunca conoce la contraseña nueva.

**Why this priority**: Cumple directamente la necesidad operativa de recuperar cuentas del equipo manteniendo la contraseña como secreto exclusivo de su titular.

**Independent Test**: Un admin elige un integrante, inicia el restablecimiento y la persona completa el enlace; luego se comprueba el cambio de contraseña y que un usuario sin rol admin no puede iniciar el proceso.

**Acceptance Scenarios**:

1. **Given** un admin y un integrante de su organización, **When** el admin inicia el restablecimiento, **Then** se genera un único proceso de recuperación para el correo del integrante y se confirma la acción sin revelar credenciales ni el enlace al admin.
2. **Given** un integrante sin rol admin, **When** intenta iniciar el restablecimiento de otra persona, **Then** la acción se rechaza sin generar enlace ni correo.
3. **Given** un admin de una organización, **When** intenta iniciar el restablecimiento de una cuenta ajena, **Then** la acción se rechaza sin revelar que esa cuenta existe ni modificarla.

---

### User Story 3 - Degradar de forma segura (Priority: P2)

Cuando el servicio de entrega de correo no está configurado o falla, el sistema conserva la seguridad de las cuentas, no se queda esperando indefinidamente y comunica una salida accionable donde el solicitante ya está autenticado.

**Why this priority**: La recuperación no debe convertirse en una fuga de cuentas ni bloquear otras funciones del CRM ante un fallo externo.

**Independent Test**: Se provoca una entrega fallida; no cambia ninguna contraseña, el flujo termina dentro del límite previsto y el admin autenticado recibe un mensaje de indisponibilidad para reintentar.

**Acceptance Scenarios**:

1. **Given** un admin autenticado y entrega de correo no disponible, **When** inicia el restablecimiento de un integrante, **Then** recibe un mensaje seguro para reintentar más tarde y ninguna contraseña cambia.
2. **Given** una solicitud pública de recuperación, **When** la entrega no puede completarse, **Then** la respuesta no revela si la cuenta existe ni expone datos técnicos o secretos.

### Edge Cases

- Solicitudes repetidas invalidan en la práctica los enlaces anteriores o mantienen cada enlace limitado a un solo uso y corta vigencia; nunca permiten usar el mismo enlace dos veces.
- La contraseña nueva debe cumplir los mismos límites que el alta de cuenta y confirmarse dos veces en la interfaz.
- Un enlace abierto en otro navegador sigue dependiendo del token personal, no de una sesión previa.
- La redirección posterior al correo solo puede volver a páginas permitidas de la propia instancia.
- Cambiar la contraseña revoca las sesiones activas de la cuenta para reducir el impacto de una sesión comprometida.
- El flujo no registra correos completos, contraseñas, tokens ni enlaces de recuperación en logs o mensajes de error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer desde la pantalla de acceso una opción visible para solicitar el restablecimiento de contraseña.
- **FR-002**: El sistema MUST responder de forma indistinguible para correos registrados y no registrados en la solicitud pública.
- **FR-003**: El sistema MUST entregar a la persona titular un enlace aleatorio, personal, de un solo uso y con vencimiento máximo de 60 minutos.
- **FR-004**: La persona MUST poder definir y confirmar una contraseña nueva que cumpla los límites vigentes del producto.
- **FR-005**: Al completarse el restablecimiento, la contraseña anterior MUST dejar de funcionar y todas las sesiones activas de esa cuenta MUST quedar revocadas.
- **FR-006**: Un admin MUST poder iniciar el restablecimiento para cualquier integrante de su organización desde la gestión del equipo.
- **FR-007**: El sistema MUST impedir que roles no administrativos inicien restablecimientos para otras personas.
- **FR-008**: El sistema MUST comprobar que el integrante objetivo pertenece a la misma organización del admin antes de generar cualquier efecto.
- **FR-009**: El admin que inicia el proceso MUST NOT recibir, ver ni definir la contraseña nueva ni acceder al enlace de recuperación del integrante.
- **FR-010**: Enlaces vencidos, alterados o consumidos MUST rechazarse sin modificar credenciales y con una ruta clara para solicitar uno nuevo.
- **FR-011**: El sistema MUST limitar solicitudes repetidas para reducir abuso y MUST terminar los intentos de entrega externa en un tiempo acotado.
- **FR-012**: El sistema MUST NOT exponer contraseñas, tokens, enlaces de recuperación, secretos del proveedor ni detalles internos en cliente, logs o respuestas de error.
- **FR-013**: Si la entrega falla o no está configurada, el sistema MUST conservar las credenciales existentes y degradar sin colgar el resto del CRM.
- **FR-014**: El sistema MUST usar únicamente Resend, mediante la integración de correo permitida por la constitución del proyecto, para entregar los enlaces de restablecimiento.
- **FR-015**: El flujo MUST funcionar en escritorio y móvil con mensajes accesibles de éxito, error, carga y enlace inválido.

### Key Entities

- **Cuenta**: Identidad de acceso de una persona, asociada a un correo y a una o más credenciales; su contraseña nunca es legible.
- **Membresía**: Relación entre una cuenta y una organización, con el rol que determina si puede iniciar restablecimientos para terceros.
- **Solicitud de restablecimiento**: Autorización temporal y de un solo uso asociada a una cuenta, con vencimiento y estado de consumo; su valor secreto no se expone al solicitante administrativo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona con acceso a su correo puede completar la recuperación desde la pantalla de acceso hasta una sesión válida en menos de 3 minutos.
- **SC-002**: El 100% de los enlaces probados como usados, vencidos o alterados son rechazados sin cambiar la contraseña.
- **SC-003**: El 100% de los intentos de un usuario no admin o de otra organización son rechazados sin generar entrega ni revelar existencia de cuentas.
- **SC-004**: Ninguna prueba funcional, respuesta o log contiene la contraseña, el token ni el enlace completo fuera del correo destinado a la persona titular.
- **SC-005**: Ante una entrega fallida, el intento termina en menos de 10 segundos, no cambia credenciales y el resto del CRM continúa disponible.
- **SC-006**: Tras un restablecimiento exitoso, la contraseña anterior y las sesiones emitidas antes del cambio fallan en el 100% de las verificaciones.

## Assumptions

- La recuperación se realiza por enlace enviado al correo de la cuenta; no se usan preguntas de seguridad, contraseñas visibles ni entrega del secreto al admin.
- El producto mantiene el mínimo vigente de 8 caracteres y el límite máximo de 128 caracteres.
- La entrega reutilizará la integración de correo ya existente, cuyo alcance constitucional fue ampliado por aprobación del dueño el 2026-08-26.
- No se agregan proveedores externos, autenticación social ni recuperación por WhatsApp.
- El cambio no altera el registro público cerrado ni la creación actual de cuentas de equipo.
