# Feature Specification: Bandera de país en la bandeja

**Feature Branch**: `working-tree`

**Created**: 2026-08-17

**Status**: Complete

**Input**: Mostrar una bandera pequeña en el avatar de cada contacto de la bandeja para identificar su país de un vistazo.

## User Scenarios & Testing

### User Story 1 - Reconocer el país desde el avatar (Priority: P1)

Como operador de la bandeja, quiero ver el país probable del contacto sobre su avatar para adaptar rápidamente el contexto de la conversación.

**Why this priority**: Es el valor completo de la solicitud y debe funcionar sin abrir detalles ni agregar trabajo manual.

**Independent Test**: Recibir conversaciones de números internacionales de países distintos y comprobar que cada fila y el encabezado del chat muestran la bandera correcta.

**Acceptance Scenarios**:

1. **Given** una conversación con un teléfono E.164 colombiano, **When** el operador abre la bandeja, **Then** el avatar muestra una bandera de Colombia pequeña y legible sin tapar las iniciales.
2. **Given** una conversación con un teléfono E.164 de otro país soportado, **When** el operador abre la bandeja y selecciona el chat, **Then** la misma bandera aparece en la fila y en el encabezado del chat.
3. **Given** un teléfono vacío, inválido o cuyo país no puede inferirse, **When** se renderiza la conversación, **Then** el avatar conserva su aspecto normal y la bandeja no falla.

### Edge Cases

- Números guardados con o sin `+`, espacios o puntuación.
- Prefijos compartidos, como el plan norteamericano `+1`, donde el país depende del número completo.
- Teléfonos inválidos o incompletos.
- Estados de selección masiva, donde el avatar se reemplaza por un checkbox.
- Tema claro, tema oscuro y avatares de los tres tamaños existentes.

## Requirements

### Functional Requirements

- **FR-001**: El sistema MUST inferir localmente el país probable desde el teléfono internacional del contacto.
- **FR-002**: La bandeja MUST mostrar una bandera compacta en la esquina inferior izquierda del avatar, preservando la esquina inferior derecha para el estado de la ventana.
- **FR-003**: El encabezado del chat abierto y el panel de contacto MUST conservar la misma identificación visual.
- **FR-004**: La bandera MUST incluir un nombre de país disponible como ayuda contextual y no depender únicamente del color.
- **FR-005**: Un teléfono no reconocible MUST degradar a un avatar sin bandera, sin excepción ni placeholder engañoso.
- **FR-006**: La resolución MUST funcionar sin red, sin nueva columna de base de datos y sin servicio externo.

## Success Criteria

### Measurable Outcomes

- **SC-001**: En el self-test, números válidos de al menos tres regiones muestran la bandera y el nombre de país esperados.
- **SC-002**: Un número inválido renderiza la bandeja sin bandera y sin errores de consola.
- **SC-003**: La fila conserva alineación, iniciales legibles y los indicadores existentes a 375, 768 y 1440 px.
- **SC-004**: Typecheck, lint, build, tests unitarios y self-test de la bandeja quedan verdes.

## Assumptions

- Los teléfonos de WhatsApp se almacenan normalmente en formato E.164 sin `+`; se tolerarán también `+`, espacios y puntuación.
- “Opción” se interpreta como capacidad visible por defecto, no como un ajuste configurable por organización.
- La bandera representa el país del número telefónico, no la ubicación física actual de la persona.

## Verification Evidence

- 13 casos unitarios verdes para países, prefijos compartidos, formatos tolerados y entradas inválidas.
- Self-test Playwright verde con 20 verificaciones: Colombia, México, España, fallback desconocido, fila, encabezado, panel, 375/768/1440 px, tema oscuro y consola limpia.
- Detector Impeccable sin hallazgos en los cuatro componentes de UI inspeccionados.
- Gate técnico verde: typecheck, lint, build y 289 tests en 44 archivos.
