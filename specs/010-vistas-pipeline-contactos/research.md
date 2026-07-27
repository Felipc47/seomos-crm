# Research: Vistas de pipeline y contactos

## Decisión 1 — Dos vistas por pantalla

**Decision**: Tablero/Lista para pipeline y Lista/Cuadrícula para contactos.

**Rationale**: Cada alternativa resuelve un problema distinto de las capturas:
el pipeline gana lectura vertical sin perder Kanban; Contactos gana densidad
visual sin reemplazar su lista detallada.

**Alternatives considered**:

- Tabla rígida: descartada porque obliga a desplazamiento horizontal en móvil.
- Tres densidades por pantalla: descartada por complejidad sin una necesidad
  observada.
- Reemplazar las vistas actuales: descartado para no alterar hábitos existentes.

## Decisión 2 — Selector segmentado reutilizable

**Decision**: Un control común con icono y texto, estado activo explícito y
operación nativa por botón.

**Rationale**: Hace consistente el producto, reduce duplicación y conserva
accesibilidad de teclado sin introducir una abstracción compleja.

**Alternatives considered**:

- Menú desplegable: ahorra espacio, pero oculta las opciones y exige más pasos.
- Solo iconos: es compacto, pero menos comprensible para usuarios nuevos.

## Decisión 3 — Preferencia local y separada

**Decision**: Recordar la vista en el navegador con una clave distinta por
pantalla y una lista cerrada de valores válidos.

**Rationale**: Cumple el comportamiento solicitado sin añadir tablas, endpoints
ni configuración por organización. La validación evita que un valor obsoleto
rompa el renderizado.

**Alternatives considered**:

- Preferencia en base de datos: sincroniza dispositivos, pero amplía esquema y
  API para una mejora visual pequeña.
- Parámetro de URL: permite compartir la vista, pero ensucia navegación y no
  recuerda por sí solo la elección.

## Decisión 4 — Equivalencia funcional

**Decision**: Las vistas alternativas conservan filtros y acciones. La lista del
pipeline permite mover etapas, incluidos los motivos de cierre obligatorios.

**Rationale**: Una vista útil no debe forzar al operador a volver a otra para una
acción cotidiana ni crear reglas de negocio paralelas.

**Alternatives considered**:

- Vistas de solo lectura: más simples, pero reducen demasiado su utilidad.
- Duplicar la lógica de movimiento: descartado por riesgo de divergencia.
