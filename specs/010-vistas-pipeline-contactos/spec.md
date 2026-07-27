# Feature Specification: Vistas de pipeline y contactos

**Feature Branch**: `codex/010-vistas-pipeline-contactos`

**Created**: 2026-07-27

**Status**: Ready

**Input**: Agregar nuevas opciones de visualización para las etapas del prospecto y los contactos.

## User Scenarios & Testing

### User Story 1 - Alternar la visualización del pipeline (Priority: P1)

Como operador comercial quiero alternar entre un tablero por etapas y una lista
general de prospectos para elegir la vista que mejor se adapte a la tarea que
estoy realizando.

**Why this priority**: El tablero actual funciona para mover oportunidades, pero
obliga a desplazarse horizontalmente cuando hay muchas etapas. La lista permite
revisar y localizar prospectos de forma más rápida.

**Independent Test**: Abrir Etapas del prospecto, cambiar entre Tablero y Lista
y comprobar que ambas vistas muestran los mismos prospectos filtrados y permiten
abrir su conversación.

**Acceptance Scenarios**:

1. **Given** un pipeline con prospectos en distintas etapas, **When** el operador
   selecciona Lista, **Then** ve todos los prospectos en una vista vertical con
   su etapa, teléfono, actividad, seguimiento y acceso a la conversación.
2. **Given** la vista Lista, **When** el operador cambia la etapa de un prospecto,
   **Then** el prospecto se actualiza y respeta las mismas reglas de cierre que el
   tablero.
3. **Given** una búsqueda activa, **When** el operador alterna entre Tablero y
   Lista, **Then** el texto de búsqueda y el conjunto de resultados se conservan.

---

### User Story 2 - Alternar la visualización de contactos (Priority: P2)

Como operador quiero alternar entre una lista detallada y una cuadrícula de
tarjetas para poder revisar muchos contactos o trabajar visualmente con uno de
ellos sin perder sus acciones principales.

**Why this priority**: La lista detallada favorece la lectura, mientras la
cuadrícula aprovecha mejor pantallas amplias y permite escanear más personas.

**Independent Test**: Abrir Contactos, cambiar entre Lista y Cuadrícula y
comprobar que ambas vistas respetan búsqueda, etapa y archivados, y permiten ver,
editar, chatear, archivar y eliminar.

**Acceptance Scenarios**:

1. **Given** una colección de contactos, **When** el operador selecciona
   Cuadrícula, **Then** ve tarjetas adaptables con identidad, teléfono, etapa,
   notas relevantes y las acciones disponibles.
2. **Given** filtros activos por búsqueda, etapa o archivo, **When** el operador
   cambia de vista, **Then** conserva los filtros y los mismos resultados.
3. **Given** una pantalla estrecha, **When** se muestra la cuadrícula, **Then**
   las tarjetas se reorganizan sin producir desplazamiento horizontal ni ocultar
   acciones esenciales.

---

### User Story 3 - Recordar la vista elegida (Priority: P3)

Como operador quiero que cada pantalla recuerde la última vista que seleccioné
para no tener que configurarla de nuevo al regresar.

**Why this priority**: Reduce fricción diaria sin afectar los datos ni las
preferencias de otros operadores.

**Independent Test**: Elegir una vista en cada pantalla, salir, volver a entrar
desde el mismo navegador y comprobar que se restaura la elección correspondiente.

**Acceptance Scenarios**:

1. **Given** que el operador eligió Lista en el pipeline, **When** vuelve a esa
   pantalla desde el mismo navegador, **Then** se restaura Lista.
2. **Given** que el operador eligió Cuadrícula en Contactos, **When** vuelve a esa
   pantalla desde el mismo navegador, **Then** se restaura Cuadrícula sin cambiar
   la preferencia independiente del pipeline.
3. **Given** que no existe una preferencia guardada o no puede leerse, **When**
   abre una pantalla, **Then** se muestra su vista actual predeterminada y la
   pantalla continúa funcionando.

### Edge Cases

- Si una búsqueda o filtro no tiene resultados, ambas vistas muestran un estado
  vacío comprensible y conservan los controles para retirar el filtro.
- Si una etapa no contiene prospectos, el tablero mantiene su columna vacía y la
  lista no inventa filas.
- Si un prospecto no tiene conversación, ninguna vista muestra una acción de chat
  que no pueda completarse.
- Si el nombre, teléfono o notas son extensos, se ajustan o recortan sin desplazar
  las acciones fuera del área visible.
- Si se intenta mover un prospecto a No calificado o No convertido desde la lista,
  se exige el motivo de cierre; cancelar conserva la etapa original.
- Si falla la actualización de etapa, la lista restaura el valor anterior y
  comunica que el cambio no pudo guardarse.
- Una preferencia guardada con un valor desconocido se ignora de forma segura.

## Requirements

### Functional Requirements

- **FR-001**: El pipeline MUST ofrecer las vistas Tablero y Lista mediante un
  selector visible, comprensible y operable con teclado.
- **FR-002**: Tablero MUST conservar el comportamiento actual de columnas y
  movimiento de prospectos.
- **FR-003**: Lista del pipeline MUST mostrar nombre, teléfono, etapa, última
  actividad, seguimiento pendiente, motivo de cierre cuando exista y acceso al
  chat cuando haya conversación.
- **FR-004**: Lista del pipeline MUST permitir cambiar la etapa respetando los
  motivos obligatorios de No calificado y No convertido.
- **FR-005**: Búsqueda y resultados MUST conservarse al cambiar la vista del
  pipeline.
- **FR-006**: Contactos MUST ofrecer las vistas Lista y Cuadrícula mediante un
  selector visible, comprensible y operable con teclado.
- **FR-007**: Ambas vistas de Contactos MUST mostrar identidad, teléfono, etapa,
  estado de archivo o baja y notas disponibles.
- **FR-008**: Ambas vistas de Contactos MUST conservar las acciones de detalle,
  edición, chat, archivo y eliminación.
- **FR-009**: Búsqueda, filtro por etapa y filtro de archivados MUST conservarse
  al cambiar la vista de Contactos.
- **FR-010**: Las vistas MUST adaptarse desde pantallas móviles hasta escritorio
  sin desplazamiento horizontal involuntario.
- **FR-011**: Cada pantalla MUST recordar de forma independiente la última vista
  elegida en el mismo navegador.
- **FR-012**: Ante una preferencia ausente, inválida o inaccesible, pipeline MUST
  usar Tablero y Contactos MUST usar Lista sin bloquear la pantalla.
- **FR-013**: Los selectores MUST comunicar mediante texto accesible cuál vista
  está activa y qué vista activa cada opción.
- **FR-014**: La funcionalidad MUST reutilizar los datos y permisos existentes;
  no debe crear copias de prospectos o contactos.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un operador puede alternar cualquiera de las vistas en un solo
  paso y percibe el cambio en menos de un segundo con los datos ya cargados.
- **SC-002**: El 100% de los prospectos y contactos que coinciden con los filtros
  activos aparece en cualquiera de sus vistas correspondientes.
- **SC-003**: El 100% de las acciones principales disponibles en la lista actual
  de Contactos sigue disponible en la cuadrícula.
- **SC-004**: El 100% de los cambios de etapa desde Lista respeta las reglas de
  cierre negativo y refleja el resultado sin recargar manualmente la página.
- **SC-005**: Al volver a cada pantalla desde el mismo navegador, la vista elegida
  se restaura en todos los casos válidos probados.
- **SC-006**: Las cuatro vistas son utilizables sin desplazamiento horizontal en
  anchos de 375, 768 y 1440 píxeles, excepto el desplazamiento horizontal propio
  del Tablero.
- **SC-007**: Todos los controles del selector de vista pueden enfocarse y
  activarse con teclado y anuncian su estado activo.

## Assumptions

- La vista predeterminada actual se conserva: Tablero para Etapas del prospecto
  y Lista para Contactos.
- La preferencia es personal al navegador; no se sincroniza entre dispositivos
  ni modifica datos de la organización.
- No se agregan ordenamiento, paginación ni filtros nuevos en esta entrega.
- No se modifica la información almacenada ni los permisos existentes.
- Las capturas entregadas representan la versión visual que debe conservarse como
  base para las vistas actuales.

## Out of Scope

- Sincronizar preferencias de visualización entre usuarios o dispositivos.
- Crear nuevas etapas, campos de contacto, filtros o reportes.
- Cambiar la API, el modelo de datos o las reglas de negocio del pipeline.
- Añadir selección masiva o edición masiva desde estas vistas.
