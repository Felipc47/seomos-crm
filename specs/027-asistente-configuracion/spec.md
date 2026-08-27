# Feature Specification: Asistente de configuración del agente

**Feature Branch**: `027-asistente-configuracion`

**Created**: 2026-08-27

**Status**: Ready

**Input**: El dueño quiere un pequeño asistente con IA que configure el bot del CRM de forma más cómoda, haciendo pocas preguntas y/o solicitando el sitio web para rellenar los campos existentes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear un borrador desde el sitio web (Priority: P1)

Como administrador del negocio, quiero pegar la URL de mi sitio y responder unas preguntas cortas para recibir una configuración inicial completa sin redactar manualmente cada sección.

**Why this priority**: Es el atajo principal solicitado y reduce la mayor parte del trabajo de configuración inicial.

**Independent Test**: Con un perfil existente, se abre el asistente, se indica una URL pública y el objetivo del bot, se genera una propuesta y se comprueba que todos los campos aparecen en una vista previa sin modificar todavía la configuración guardada.

**Acceptance Scenarios**:

1. **Given** un administrador con proveedor de IA configurado, **When** indica una URL pública accesible y responde las preguntas mínimas, **Then** recibe un borrador de nombre, saludo, tonos, instrucciones por sección, reglas de escalado y conocimiento del negocio.
2. **Given** un borrador generado, **When** el administrador todavía no lo ha aplicado, **Then** los campos del formulario y la configuración persistida conservan sus valores anteriores.
3. **Given** un borrador generado, **When** el administrador confirma “Usar este borrador”, **Then** los campos visibles se rellenan y permanecen editables antes del guardado normal.

---

### User Story 2 - Configurar sin sitio web (Priority: P2)

Como administrador de un negocio sin sitio, quiero describir brevemente lo que vendo, el objetivo del bot y sus límites para obtener la misma clase de borrador guiado.

**Why this priority**: El sitio web es opcional; el flujo debe servir también a negocios nuevos o con presencia únicamente en redes sociales.

**Independent Test**: Se deja la URL vacía, se completa la descripción del negocio y las demás respuestas requeridas, y se obtiene una propuesta completa y aplicable.

**Acceptance Scenarios**:

1. **Given** que no se proporciona una URL, **When** el administrador describe el negocio y el objetivo del bot, **Then** puede generar una propuesta sin bloqueos.
2. **Given** que no hay URL ni descripción del negocio, **When** intenta continuar, **Then** el asistente explica qué dato falta y no inicia la generación.

---

### User Story 3 - Fallar de forma segura (Priority: P3)

Como administrador, quiero entender qué pasó si el sitio no puede leerse o la IA falla, para corregir el dato o continuar manualmente sin perder mi configuración.

**Why this priority**: El asistente depende de entradas y servicios falibles, pero nunca debe bloquear ni dañar la configuración existente.

**Independent Test**: Se provoca una URL inválida, una URL privada y un fallo temporal del proveedor; cada caso muestra un mensaje accionable, cierra el estado de carga y conserva el formulario original.

**Acceptance Scenarios**:

1. **Given** una URL inválida, privada o inaccesible, **When** se intenta generar, **Then** el sistema rechaza o degrada la lectura con un mensaje claro y no consulta destinos internos.
2. **Given** una respuesta vacía, inesperada o fallida del proveedor, **When** termina el intento, **Then** el asistente deja de cargar, conserva las respuestas y permite reintentar o volver a la edición manual.
3. **Given** que el proveedor de IA no está configurado, **When** se muestra la página, **Then** el acceso al asistente se presenta deshabilitado con una explicación.

### Edge Cases

- El sitio redirige a otra URL, responde contenido no HTML, es demasiado grande o tarda demasiado.
- La URL usa credenciales, un puerto no permitido, localhost, una IP privada o un nombre que resuelve a una red privada.
- El sitio contiene instrucciones maliciosas para el modelo; su contenido se trata únicamente como fuente no confiable sobre el negocio.
- El perfil ya tiene contenido: la propuesta no se guarda ni reemplaza automáticamente.
- La respuesta propone tonos inexistentes o textos fuera de límites: se rechaza y reintenta mediante el adaptador robusto.
- El administrador cierra el asistente durante o después de generar; el formulario existente queda intacto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer el asistente dentro de la pantalla existente de configuración del agente a los mismos roles autorizados para editarla.
- **FR-002**: El asistente MUST aceptar una URL pública opcional, una descripción breve del negocio, un objetivo principal del bot y límites o reglas importantes.
- **FR-003**: El sistema MUST exigir al menos una fuente de contexto del negocio: URL válida o descripción escrita.
- **FR-004**: El sistema MUST obtener únicamente contenido público seguro y acotado; MUST rechazar credenciales en URL, hosts locales, redes privadas, puertos no permitidos y redirecciones hacia esos destinos.
- **FR-005**: El contenido de sitios externos MUST tratarse como datos no confiables y nunca como instrucciones para el sistema.
- **FR-006**: El sistema MUST generar un borrador compatible con todos los campos actuales de comportamiento: nombre, saludo, tonos, matiz opcional, seis secciones de instrucciones y reglas de escalado.
- **FR-007**: El sistema MUST proponer además un bloque de conocimiento compacto con hechos del negocio y advertencias explícitas contra inventar información no confirmada.
- **FR-008**: El usuario MUST revisar un resumen de la propuesta antes de aplicarla.
- **FR-009**: Aplicar la propuesta MUST rellenar el formulario existente y el borrador de conocimiento, pero MUST NOT persistirlos ni activar el agente automáticamente.
- **FR-010**: Los campos rellenados MUST permanecer editables y utilizar los controles de guardado ya existentes.
- **FR-011**: El sistema MUST conservar intacta la configuración actual cuando el usuario cancele, cierre el asistente o la generación falle.
- **FR-012**: Los estados de validación, lectura, generación, éxito y error MUST ser comprensibles, accesibles con teclado y no depender únicamente del color.
- **FR-013**: Si la IA no está configurada, el sistema MUST explicar la dependencia y mantener disponible la configuración manual.
- **FR-014**: La generación MUST reutilizar exclusivamente el proveedor LLM OpenRouter-compatible ya permitido y MUST degradar sin colgarse ante formato inesperado o fallo del proveedor.
- **FR-015**: Toda solicitud MUST respetar permisos y aislamiento por organización; ningún contenido de otro tenant puede entrar en el borrador.
- **FR-016**: La experiencia MUST funcionar en escritorio y móvil sin ocultar acciones ni producir desbordamiento horizontal.

### Key Entities

- **Respuestas del asistente**: URL opcional, descripción del negocio, objetivo del bot y límites proporcionados por el administrador durante la sesión de edición.
- **Contexto del sitio**: texto público, acotado y no confiable obtenido de una URL validada; no se persiste como fuente independiente.
- **Borrador de configuración**: propuesta temporal compatible con el perfil del agente y un bloque de conocimiento; no modifica datos hasta que el usuario usa los guardados existentes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador puede llegar desde la pantalla del agente hasta un borrador completo respondiendo como máximo cuatro entradas y sin editar manualmente cada sección.
- **SC-002**: En pruebas de aceptación, el 100% de los campos actuales de comportamiento recibe una propuesta válida o un valor explícitamente vacío permitido.
- **SC-003**: Cancelar, cerrar o provocar un error conserva el 100% de los valores que tenía el formulario antes de abrir el asistente.
- **SC-004**: Cada intento exitoso o fallido abandona el estado de carga y ofrece una siguiente acción observable en menos de 65 segundos.
- **SC-005**: Los destinos locales o privados probados son rechazados antes de obtener contenido y las redirecciones inseguras tampoco se siguen.
- **SC-006**: El flujo completo puede operarse por teclado y mantiene visibles las acciones principales a 375 px y 1440 px de ancho.

## Assumptions

- La primera versión genera un borrador en una sola interacción guiada; no es un chat abierto ni un constructor visual de flujos.
- La URL es opcional y no se rastrea el sitio completo: se analiza una sola página pública con límites estrictos.
- No se añade una nueva tabla ni se persiste el historial del asistente; solo se utilizan los campos y endpoints de guardado ya existentes.
- El asistente no consume créditos operativos de conversaciones, porque es una acción administrativa de configuración y no un turno atendido a un cliente.
- El nombre sugerido y el conocimiento generado son propuestas que el administrador debe revisar; no se consideran hechos confirmados hasta que los guarde.
