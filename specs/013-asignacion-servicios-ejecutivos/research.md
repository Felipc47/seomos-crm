# Research: Asignación de servicios a ejecutivos

## Decisión 1 — Regla mutable y atribución operativa separadas

**Decision**: Guardar el responsable vigente en el servicio y copiar servicio y
responsable al prospecto cuando se procesa un evento leadgen nuevo.

**Rationale**: Cambiar la distribución futura no debe modificar silenciosamente
oportunidades que ya fueron entregadas a un asesor. La copia también evita que
los listados dependan del responsable actual del servicio.

**Alternatives considered**:

- Calcular siempre el responsable desde el servicio: descartado por perder
  trazabilidad y reasignar retroactivamente.
- Crear una tabla de historial por evento: útil para múltiples oportunidades
  por contacto, pero excede el modelo actual de un prospecto por contacto.

## Decisión 2 — Un responsable por servicio

**Decision**: Un servicio acepta como máximo un miembro comercial; un miembro
puede tener muchos servicios.

**Rationale**: Coincide con “asesor encargado”, hace determinista el
enrutamiento y evita introducir reglas de round-robin no solicitadas.

**Alternatives considered**:

- Muchos responsables con rotación: requeriría estrategia, disponibilidad y
  estados de reparto que el dueño no pidió.
- Asignación por campaña además de servicio: el formulario ya es la fuente
  estable que identifica el servicio.

## Decisión 3 — Notificación sin aislamiento de visibilidad

**Decision**: Notificar personalmente al responsable y mostrar la asignación a
todo el equipo, sin restringir consultas por asesor.

**Rationale**: “Le llega” queda resuelto operativamente sin convertir la
asignación en una nueva frontera de permisos que podría ocultar conversaciones
al resto del negocio.

**Alternatives considered**:

- Bandejas privadas por asesor: cambia el modelo de autorización y requiere una
  decisión de producto aparte.
- Solo una etiqueta visual: no alerta al ejecutivo cuando entra un prospecto.

## Decisión 4 — Rol comercial vigente

**Decision**: Solo `commercial` y el rol legado equivalente son elegibles. Al
cambiar el rol, se liberan las reglas de servicio, pero los prospectos
existentes conservan su atribución mientras el miembro exista.

**Rationale**: Impide enrutamientos futuros hacia usuarios no comerciales y
mantiene trazabilidad del trabajo ya entregado.

## Decisión 5 — Degradación de notificación

**Decision**: Persistir primero prospecto y evento; crear la notificación
después dentro de un bloque tolerante a fallos.

**Rationale**: Una alerta in-app es secundaria frente a no perder el lead. La
idempotencia del evento evita repetir el aviso en reintentos normales.
