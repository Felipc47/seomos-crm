# Feature Specification: Integración de formularios WordPress

**Feature Branch**: `022-wordpress-forms`

**Created**: 2026-08-13

**Status**: Approved

**Input**: Integrar una página WordPress con Seomos CRM para que los envíos de sus formularios se sincronicen y desencadenen la lógica comercial existente del CRM.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recibir un prospecto desde WordPress (Priority: P1)

Como administrador de una empresa, quiero conectar un formulario de mi sitio WordPress con Seomos para que cada envío válido aparezca de inmediato como contacto, conversación y prospecto en el pipeline.

**Why this priority**: Es el valor principal de la integración: eliminar la copia manual y llevar los formularios web al mismo flujo operativo de WhatsApp.

**Independent Test**: Crear una integración, enviar desde un formulario un identificador único, nombre, teléfono, email y consulta, y comprobar que el prospecto aparece una sola vez en Bandeja, Pipeline y Contactos.

**Acceptance Scenarios**:

1. **Given** una integración activa y un envío válido, **When** WordPress entrega el formulario, **Then** el CRM crea o reactiva el contacto, asegura su conversación real y crea su prospecto en la primera etapa abierta.
2. **Given** un teléfono que ya pertenece a un contacto de la misma empresa, **When** llega un formulario nuevo, **Then** el CRM actualiza únicamente los datos seguros que estaban vacíos, registra el nuevo contexto y no duplica contacto, conversación ni prospecto.
3. **Given** el mismo identificador de envío entregado varias veces, **When** el CRM procesa los reintentos, **Then** produce una sola entrada y una sola cadena de efectos observables.
4. **Given** un envío autenticado que pertenece a otra integración o empresa, **When** intenta cruzar datos, **Then** no puede leer ni modificar ningún recurso ajeno.

---

### User Story 2 - Desencadenar la lógica comercial del CRM (Priority: P1)

Como responsable comercial, quiero que un formulario web aplique automáticamente el servicio, responsable, avisos y saludo configurados para poder atenderlo igual que cualquier otro lead del CRM.

**Why this priority**: Sin esta continuidad el formulario solo sería una libreta de contactos y no activaría el valor operativo de Seomos.

**Independent Test**: Vincular la integración a un servicio con responsable y plantilla, enviar un prospecto con consentimiento explícito y comprobar atribución, notificaciones y un único intento de saludo; repetir sin consentimiento y comprobar que el lead entra sin envío saliente.

**Acceptance Scenarios**:

1. **Given** una integración vinculada a un servicio, **When** entra un envío nuevo, **Then** el prospecto conserva ese servicio y la regla vigente de asignación del CRM se aplica sin aceptar IDs de servicio o usuario enviados por WordPress.
2. **Given** un prospecto nuevo con consentimiento explícito y una plantilla de saludo configurada, **When** entra el formulario, **Then** el CRM intenta un solo saludo por WhatsApp y el fallo del canal no revierte el prospecto.
3. **Given** que falta consentimiento explícito, una conexión de WhatsApp o una plantilla, **When** entra el formulario, **Then** el prospecto y sus avisos internos se crean normalmente sin realizar un envío saliente.
4. **Given** que un aviso secundario o el canal de WhatsApp falla, **When** se procesa el formulario, **Then** la respuesta termina sin colgarse y el prospecto ya persistido permanece disponible.

---

### User Story 3 - Configurar y diagnosticar la conexión (Priority: P2)

Como administrador, quiero crear, probar, rotar y desactivar integraciones de formularios desde Ajustes para conectar WordPress sin exponer credenciales ni depender de cambios de código en el CRM.

**Why this priority**: Hace que la integración sea operable por cada empresa y permite responder a filtraciones o cambios de sitio.

**Independent Test**: Crear dos integraciones en empresas distintas, copiar la URL y secreto mostrados una sola vez, ejecutar una prueba, rotar el secreto y verificar que el anterior deja de funcionar; un miembro no administrador recibe acceso denegado.

**Acceptance Scenarios**:

1. **Given** un administrador autenticado, **When** crea una integración, **Then** recibe su URL y un secreto de alta entropía mostrado una sola vez, junto con instrucciones copiables.
2. **Given** una integración existente, **When** el administrador vuelve a la pantalla, **Then** solo ve su nombre, estado, servicio, últimos cuatro caracteres del secreto, último resultado y momento de uso.
3. **Given** un secreto rotado o una integración desactivada, **When** WordPress usa la configuración anterior, **Then** el CRM rechaza el envío sin revelar si la empresa, integración o secreto era el dato incorrecto.
4. **Given** un usuario comercial sin permiso administrativo, **When** intenta crear, rotar, probar o desactivar una integración, **Then** recibe acceso denegado y no obtiene ningún secreto.

---

### User Story 4 - Conectar formularios comunes de WordPress (Priority: P3)

Como persona que administra el sitio WordPress, quiero una receta concreta y un contrato estable para conectar Contact Form 7, Elementor Forms, WPForms o un webhook propio sin conocer la arquitectura interna de Seomos.

**Why this priority**: Reduce errores de instalación y evita acoplar el CRM a un único constructor de formularios.

**Independent Test**: Seguir las instrucciones publicadas usando el ejemplo canónico, enviar datos equivalentes como JSON y como formulario codificado y obtener el mismo prospecto observable.

**Acceptance Scenarios**:

1. **Given** la pantalla de integración, **When** el administrador consulta las instrucciones, **Then** encuentra el contrato de campos, autenticación, ejemplo de prueba y guías para los constructores soportados.
2. **Given** un cliente que envía JSON o datos de formulario codificados con los campos canónicos, **When** entrega una solicitud válida, **Then** ambos formatos producen el mismo resultado de negocio.
3. **Given** campos adicionales del formulario, **When** se procesa el envío, **Then** solo se conservan los campos comerciales permitidos y nunca contraseñas, cookies, cabeceras o el payload crudo.

### Edge Cases

- El teléfono llega con espacios, paréntesis, prefijo `+` o enlace `wa.me`: se normaliza al formato internacional ya usado por el CRM; un número ambiguo o demasiado corto se rechaza.
- El identificador externo se repite con datos distintos: prevalece el primer procesamiento y la respuesta informa que ya había sido recibido sin repetir efectos.
- Dos solicitudes idénticas llegan al mismo tiempo: la restricción de unicidad decide un único ganador antes de crear notificaciones o mensajes.
- El contacto estaba archivado, bloqueado o dado de baja: se reactiva el archivado para operación, pero el bloqueo y la baja permanecen y nunca se envía un saludo.
- El contacto ya tiene nombre, email, notas, servicio o responsable editados por un operador: el formulario no pisa datos humanos no vacíos ni reasigna una oportunidad histórica.
- La integración apunta a un servicio eliminado o desactivado: el lead entra sin atribución inválida y el administrador ve un diagnóstico sanitizado.
- Faltan campos obligatorios, el cuerpo supera el límite, el tipo de contenido no es compatible o el secreto es incorrecto: se rechaza antes de cualquier efecto de dominio.
- La empresa está suspendida: todas sus integraciones dejan de aceptar envíos.
- Un bot repite solicitudes inválidas: la ruta limita abuso por integración/origen sin registrar secretos ni cuerpos completos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir que un administrador cree múltiples integraciones de formularios aisladas dentro de su empresa y vincule opcionalmente cada una a un servicio propio.
- **FR-002**: Cada integración MUST tener un secreto independiente de alta entropía, almacenado cifrado, mostrado completo solo al crearlo o rotarlo y nunca incluido en logs o listados posteriores.
- **FR-003**: El sistema MUST aceptar envíos autenticados en JSON y formulario codificado mediante un contrato canónico con identificador externo, teléfono, nombre, email, consulta, origen, campaña, URL de página y consentimiento explícito.
- **FR-004**: Cada envío MUST incluir un identificador externo no vacío y MUST ser idempotente dentro de la integración, incluso ante reintentos y concurrencia.
- **FR-005**: El sistema MUST validar tamaño, tipos, longitudes y teléfono antes de persistir, conservar únicamente campos comerciales permitidos y descartar campos adicionales.
- **FR-006**: Un envío nuevo MUST crear o reactivar el contacto tenant-safe, asegurar una única conversación real y crear el prospecto mediante la entrada común del pipeline.
- **FR-007**: Un contacto existente MUST conservar datos no vacíos editados previamente; la integración solo puede completar nombre o email vacíos y agregar una nota de procedencia sanitizada por cada envío nuevo.
- **FR-008**: La fuente del contacto MUST distinguir un formulario web de Meta Ads, WhatsApp directo, alta manual e importación; el consentimiento de marketing MUST registrarse solo cuando el envío contiene una afirmación explícita válida.
- **FR-009**: La atribución de servicio MUST provenir exclusivamente de la configuración tenant-safe de la integración y MUST conservar la asignación histórica ya presente en el prospecto.
- **FR-010**: Un prospecto nuevo MUST disparar las notificaciones internas y por email existentes con las mismas garantías de aislamiento, idempotencia y degradación segura del CRM.
- **FR-011**: El saludo por WhatsApp MUST intentarse como máximo una vez solo para un contacto nuevo, no bloqueado ni dado de baja, con consentimiento explícito, conexión disponible y plantilla configurada; su fallo MUST ser no bloqueante.
- **FR-012**: El procesamiento MUST publicar la actualización de tiempo real para que el nuevo prospecto aparezca sin recargar manualmente.
- **FR-013**: Solo administradores de la empresa MUST poder listar, crear, probar, rotar, editar o desactivar integraciones; miembros no administrativos y usuarios de otras empresas MUST recibir acceso denegado.
- **FR-014**: La pantalla de configuración MUST mostrar URL, contrato, ejemplos copiables, estado, últimos cuatro caracteres del secreto, último uso y diagnóstico sanitizado, sin volver a revelar el secreto completo.
- **FR-015**: Rotar el secreto MUST invalidar inmediatamente el anterior y desactivar la integración MUST rechazar nuevos envíos sin eliminar los prospectos ya creados.
- **FR-016**: Las respuestas MUST distinguir éxito nuevo, duplicado idempotente, validación inválida, autenticación rechazada y límite de abuso sin revelar recursos, secretos o datos internos.
- **FR-017**: La integración MUST incluir instrucciones verificables para Contact Form 7, Elementor Forms, WPForms y emisores de webhook propios usando el mismo contrato estable.
- **FR-018**: Toda tabla de dominio nueva MUST llevar empresa obligatoria e índice iniciado por empresa; todas las consultas y mutaciones MUST acotarse por esa empresa.
- **FR-019**: La ruta pública MUST rechazar empresas suspendidas, limitar el cuerpo a 32 KiB y responder en menos de 3 segundos en condiciones normales sin esperar notificaciones o envíos externos lentos.
- **FR-020**: El sistema MUST registrar únicamente metadatos operativos sanitizados —estado, momento, integración y error seguro— y nunca el secreto, cabeceras completas o cuerpo crudo.

### Key Entities

- **Integración de formulario**: Configuración de una empresa y un sitio/formulario; contiene nombre, servicio opcional, secreto cifrado, sufijo visible, estado, último uso y último diagnóstico sanitizado.
- **Envío de formulario**: Registro idempotente de un evento externo dentro de una integración; conserva identificador externo, resultado, contacto/prospecto asociados, timestamps y error seguro, pero no el cuerpo crudo.
- **Prospecto web**: Contacto y oportunidad comercial creados o actualizados a partir de un envío; comparte conversación, pipeline, servicio, responsable y notificaciones con los demás orígenes.
- **Consentimiento explícito**: Afirmación booleana del formulario que permite registrar permiso para contacto comercial; su ausencia o falsedad nunca se interpreta como consentimiento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En pruebas de extremo a extremo, el 100% de los envíos válidos aparece en Bandeja, Pipeline y Contactos en menos de 3 segundos con la atribución configurada.
- **SC-002**: Entregar diez veces el mismo identificador, incluidas solicitudes concurrentes, produce exactamente un registro de envío, un prospecto y como máximo un saludo y un aviso por destinatario.
- **SC-003**: El 100% de las pruebas con secreto incorrecto, integración desactivada, empresa suspendida o usuario sin permisos termina sin exponer existencia de recursos, secretos o datos de otra empresa.
- **SC-004**: El 100% de los fallos provocados de WhatsApp o email conserva el prospecto y devuelve una respuesta acotada sin colgar el flujo.
- **SC-005**: Un administrador puede completar la configuración y enviar una prueba válida usando solo las instrucciones de la pantalla en menos de 10 minutos.
- **SC-006**: JSON y formulario codificado producen resultados equivalentes para el 100% de los casos canónicos automatizados.
- **SC-007**: Ningún secreto, payload crudo, cookie o cabecera sensible aparece en respuestas, vistas, logs o registros de prueba.

## Assumptions

- La sincronización v1 es entrante, WordPress → Seomos. Editar un contacto en el CRM no modifica el formulario ni la base de datos de WordPress.
- Cada formulario o sitio que necesite credenciales, servicio o trazabilidad independiente usa una integración distinta.
- WordPress o su constructor puede emitir un webhook después de aceptar el formulario y conservar/reutilizar un identificador único durante sus reintentos.
- Los campos canónicos son `externalId`, `phone`, `name`, `email`, `message`, `source`, `campaign`, `pageUrl` y `consent`; se documentarán aliases compatibles en formato codificado.
- La configuración de servicio es autoridad sobre IDs externos. El formulario no puede elegir arbitrariamente servicios, responsables, etapas ni acciones.
- El consentimiento explícito autoriza el primer contacto comercial, pero siguen vigentes la baja, el bloqueo y las políticas de WhatsApp.

## Out of Scope

- Sincronización bidireccional con WordPress, lectura de su base de datos o descubrimiento remoto de formularios.
- Constructor visual de automatizaciones, ejecución de código aportado por el formulario o acciones arbitrarias configurables.
- Guardar el payload completo, archivos adjuntos, contraseñas, cookies, datos de pago o campos sensibles no incluidos en el contrato.
- Instalar o actualizar plugins dentro del WordPress remoto desde Seomos.
- Reemplazar las reglas existentes de pipeline, asignación, consentimiento, notificación o mensajería del CRM.
