# Feature Specification: Sitio público y documentos legales para Google OAuth

**Feature Branch**: `021-public-legal-google-oauth`

**Created**: 2026-08-12

**Status**: Approved

**Input**: Crear las URLs públicas que Google OAuth solicita y agregarlas a Seomos CRM.

## User Scenarios & Testing

### User Story 1 - Conocer Seomos CRM sin iniciar sesión (Priority: P1)

Como visitante o revisor de Google, quiero abrir la página principal pública para entender quién ofrece Seomos CRM, qué hace y por qué solicita acceso a Google Calendar.

**Independent Test**: Abrir `/` sin sesión y comprobar que presenta Seomos CRM, describe sus funciones y ofrece acceso visible a privacidad, términos e inicio de sesión.

**Acceptance Scenarios**:

1. **Given** una persona sin sesión, **When** abre `/`, **Then** ve una página pública que identifica Seomos CRM y no es redirigida al login.
2. **Given** un revisor de OAuth, **When** inspecciona la página, **Then** encuentra una explicación de que Calendar se usa para consultar disponibilidad, evitar cruces y crear reuniones con invitados y Google Meet.
3. **Given** un visitante, **When** usa los enlaces del encabezado o pie, **Then** puede abrir la política de privacidad, los términos o el inicio de sesión.

### User Story 2 - Revisar el tratamiento de datos (Priority: P1)

Como usuario que conecta Google Calendar, quiero una política pública y clara para saber qué datos accede Seomos CRM, para qué los usa, cómo los protege y cómo revocar o solicitar su eliminación.

**Independent Test**: Abrir `/privacy` sin sesión y comprobar las divulgaciones específicas de Google, seguridad, terceros, conservación, revocación y contacto.

**Acceptance Scenarios**:

1. **Given** una persona sin sesión, **When** abre `/privacy`, **Then** obtiene HTTP 200 y puede leer la política completa sin autenticarse.
2. **Given** un usuario de Google, **When** revisa la sección de Google Calendar, **Then** encuentra los datos accedidos, sus finalidades limitadas y la declaración de no venta, publicidad ni entrenamiento de modelos.
3. **Given** un usuario que desea dejar de compartir datos, **When** revisa la política, **Then** encuentra cómo desconectar Calendar, revocar el acceso en Google y pedir eliminación por correo.

### User Story 3 - Consultar las condiciones del servicio (Priority: P2)

Como usuario de Seomos CRM, quiero conocer las condiciones de uso, las responsabilidades y las limitaciones de integraciones y funciones de IA antes de usar el servicio.

**Independent Test**: Abrir `/terms` sin sesión y comprobar que identifica el servicio, uso permitido, datos, integraciones, IA, disponibilidad y contacto.

**Acceptance Scenarios**:

1. **Given** una persona sin sesión, **When** abre `/terms`, **Then** obtiene HTTP 200 y puede leer los términos sin autenticarse.
2. **Given** un usuario autenticado o en login, **When** busca los documentos legales, **Then** encuentra enlaces públicos a privacidad y términos.

### Edge Cases

- La base de datos no está disponible: las páginas públicas conservan la marca predeterminada Seomos CRM y siguen renderizando.
- El visitante usa móvil o tema oscuro: el contenido sigue siendo legible y navegable.
- Una URL pública inexistente se solicita: Next.js responde 404 y no confunde al usuario con un documento legal válido.
- No hay sesión: ninguna de las tres páginas exige autenticación ni expone datos internos.

## Requirements

### Functional Requirements

- **FR-001**: `/` MUST ser una página pública accesible sin autenticación y describir Seomos CRM como CRM de WhatsApp con agente de IA, pipeline, equipo, notificaciones y Calendar opcional.
- **FR-002**: `/` MUST explicar de forma visible el uso de Google Calendar y enlazar la política de privacidad.
- **FR-003**: `/privacy` MUST ser pública y revelar los datos recopilados, finalidades, almacenamiento, seguridad, terceros, conservación, derechos y contacto.
- **FR-004**: La política MUST describir específicamente el correo de la cuenta Google, disponibilidad, eventos creados y tokens OAuth; y MUST limitar su uso al agendamiento solicitado por el usuario.
- **FR-005**: La política MUST declarar que los datos de Google no se venden, no se usan para publicidad y no se usan para entrenar modelos de IA.
- **FR-006**: `/terms` MUST ser pública y describir condiciones de cuenta, uso permitido, responsabilidad sobre datos, integraciones, IA, disponibilidad, propiedad y contacto.
- **FR-007**: Las tres páginas MUST compartir navegación, pie, marca visual Seomos CRM y enlaces consistentes.
- **FR-008**: Login y CRM MUST ofrecer enlaces a los documentos legales sin exigir una ruta autenticada adicional.
- **FR-009**: Las páginas MUST incluir metadata independiente y lenguaje español claro.
- **FR-010**: Ninguna página pública MUST consultar ni revelar datos de organizaciones, usuarios, contactos, conversaciones o credenciales.

## Success Criteria

- **SC-001**: `/`, `/privacy` y `/terms` responden 200 en una sesión anónima y muestran el título esperado.
- **SC-002**: Desde `/` se navega a ambos documentos legales y desde ellos se regresa a la página principal.
- **SC-003**: Un revisor encuentra en la página principal y la política las finalidades exactas de Google Calendar en menos de dos navegaciones.
- **SC-004**: El gate técnico completo y el E2E anónimo feliz/infeliz terminan verdes.

## Assumptions

- El dominio canónico de producción es `https://crm.seomos.cloud`.
- El contacto público y de privacidad es `ceo@seomos.com`.
- “Seomos” identifica al operador público; no se inventa una razón social ni dirección postal no entregadas por el dueño.
- Los textos son informativos y específicos al comportamiento actual del producto; una revisión jurídica local puede complementarlos sin cambiar las URLs.

## Out of Scope

- Cambiar la configuración directamente en Google Cloud o enviar la solicitud de verificación.
- Construir autoservicio de eliminación de cuenta o datos.
- Añadir cookies analíticas, publicidad, facturación o nuevos terceros.
