# Feature Specification: Edición unificada del prospecto

**Feature Branch**: `codex/011-edicion-unificada-prospecto`

**Created**: 2026-07-27

**Status**: Ready

**Input**: Permitir editar todos los atributos operativos del lead desde
Bandeja, Etapas del prospecto y Contactos mediante una experiencia unificada.

## User Scenarios & Testing

### User Story 1 - Editar la ficha completa desde cualquier vista (Priority: P1)

Como operador comercial quiero editar nombre, WhatsApp, correo, notas y etapa
desde cualquiera de las tres vistas para corregir o completar un prospecto sin
buscarlo en otra pantalla.

**Independent Test**: Abrir el mismo prospecto desde Bandeja, Pipeline y
Contactos; comprobar que las tres entradas muestran los mismos campos y que un
cambio guardado se refleja en las demás vistas.

**Acceptance Scenarios**:

1. **Given** un prospecto visible en una de las tres pantallas, **When** el
   operador activa Editar, **Then** ve nombre, WhatsApp, correo, notas y etapa
   con los valores actuales.
2. **Given** valores válidos, **When** guarda la ficha, **Then** todos los
   cambios persisten juntos y la pantalla refleja el resultado sin recarga
   manual.
3. **Given** un cambio de WhatsApp, **When** guarda, **Then** se conserva el
   historial, la conversación y el prospecto existentes bajo el mismo registro.

---

### User Story 2 - Proteger la calidad de los datos (Priority: P1)

Como operador quiero recibir errores claros ante un teléfono inválido,
duplicado o una etapa negativa sin motivo para no dañar el historial ni los
reportes.

**Independent Test**: Intentar guardar un teléfono duplicado y mover el
prospecto a cada etapa negativa sin motivo; comprobar que no cambia ningún
campo y que el formulario explica cómo corregirlo.

**Acceptance Scenarios**:

1. **Given** otro contacto con el mismo WhatsApp en la empresa, **When** el
   operador intenta asignarlo, **Then** el sistema rechaza el guardado y
   conserva los datos previos de ambos contactos.
2. **Given** un WhatsApp que no contiene entre 7 y 15 dígitos, **When** intenta
   guardar, **Then** el formulario no envía el cambio y muestra la regla.
3. **Given** No calificado o No convertido, **When** el operador selecciona esa
   etapa, **Then** debe elegir un motivo válido antes de guardar.
4. **Given** un fallo del servidor, **When** el guardado no se completa,
   **Then** el modal permanece abierto con los datos escritos y un error visible.

---

### User Story 3 - Distinguir datos editables de estados protegidos (Priority: P2)

Como operador quiero que el editor se limite a la información comercial que
debo mantener para no modificar accidentalmente cumplimiento, automatizaciones
o datos derivados por IA.

**Independent Test**: Abrir el editor y comprobar que no contiene controles de
baja, consentimiento, archivo, estado de IA, seguimiento ni ficha generada por
IA, mientras esos controles especializados siguen disponibles donde existían.

**Acceptance Scenarios**:

1. **Given** un contacto con baja o consentimiento registrado, **When** se
   edita su ficha, **Then** esos estados no cambian.
2. **Given** una ficha derivada por IA, **When** se guardan cambios manuales,
   **Then** la ficha derivada no se sobrescribe.
3. **Given** un prospecto con conversación o seguimiento, **When** cambia su
   información personal sin cambiar de etapa, **Then** esos estados se conservan.

### Edge Cases

- El teléfono puede pegarse con espacios, `+`, guiones o paréntesis; el editor
  lo normaliza a dígitos antes de validar y guardar.
- El mismo teléfono puede existir en otra empresa, pero no dos veces dentro de
  la misma organización.
- Cambiar hacia una etapa terminal limpia el seguimiento pendiente y registra
  el cierre según las reglas existentes; reabrir limpia motivo y fecha.
- Un contacto excepcional sin lead puede editar sus datos personales, pero no
  inventa una etapa.
- Cerrar o cancelar el modal no guarda cambios.
- Una respuesta lenta no permite enviar el formulario dos veces.

## Requirements

### Functional Requirements

- **FR-001**: Bandeja, Etapas del prospecto y Contactos MUST abrir el mismo
  componente de edición para un prospecto.
- **FR-002**: El editor MUST permitir cambiar nombre, WhatsApp, correo, notas y
  etapa actual.
- **FR-003**: Nombre MUST contener entre 1 y 120 caracteres después de recortar.
- **FR-004**: WhatsApp MUST normalizarse a dígitos y contener entre 7 y 15.
- **FR-005**: Correo MUST ser opcional y, cuando exista, tener formato válido y
  máximo 254 caracteres.
- **FR-006**: Notas MUST ser opcionales y tener máximo 4000 caracteres.
- **FR-007**: El teléfono MUST ser único dentro de la organización y un
  conflicto MUST responder con un mensaje comprensible, sin fusionar registros.
- **FR-008**: Cambiar el teléfono MUST conservar IDs, conversación, mensajes,
  lead y demás relaciones del contacto.
- **FR-009**: Cambiar a No calificado o No convertido MUST exigir un motivo
  válido para la etapa elegida.
- **FR-010**: Un cambio de etapa MUST conservar las reglas actuales de cierre,
  reapertura y cancelación de seguimiento.
- **FR-011**: Los cambios de ficha y etapa MUST persistir de forma atómica.
- **FR-012**: Al guardar, cada pantalla MUST refrescar el dato visible sin
  exigir una recarga manual.
- **FR-013**: Un error MUST mantener abierto el editor, conservar los valores
  escritos y mostrarse dentro del modal.
- **FR-014**: El editor MUST ser usable con teclado, tener nombre accesible y
  adaptarse a móvil sin desbordamiento horizontal.
- **FR-015**: Estados de cumplimiento, archivo, IA, seguimiento y campos
  derivados MUST permanecer fuera del editor general y conservar sus flujos
  especializados.
- **FR-016**: Todas las lecturas y escrituras MUST respetar el aislamiento por
  organización existente.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Las tres entradas muestran el mismo conjunto de cinco atributos y
  el mismo comportamiento de validación en el 100% de los casos probados.
- **SC-002**: El 100% de los guardados válidos actualiza las tres superficies
  sin perder conversación, mensajes ni lead.
- **SC-003**: El 100% de los teléfonos inválidos o duplicados probados es
  rechazado sin cambios parciales.
- **SC-004**: El 100% de las transiciones negativas probadas exige y persiste un
  motivo permitido.
- **SC-005**: El editor es utilizable a 375, 768 y 1440 píxeles y mediante
  teclado.
- **SC-006**: Los estados protegidos permanecen idénticos después de editar la
  ficha en todos los escenarios automatizados.

## Assumptions

- “Todos los atributos” se refiere a los campos operativos y manuales del
  prospecto: nombre, WhatsApp, correo, notas y etapa.
- La ficha generada por IA, baja, consentimiento, archivo, seguimiento,
  timestamps e identificadores son datos derivados, de cumplimiento o de
  sistema; no forman parte del editor general.
- Cambiar el número altera el destino de futuros mensajes, pero no intenta
  fusionar contactos ni mover mensajes entre registros.

## Out of Scope

- Crear campos personalizados.
- Editar en masa varios prospectos.
- Fusionar contactos duplicados.
- Editar manualmente la ficha generada por IA.
- Cambiar controles de consentimiento, baja, archivo o configuración de IA.
