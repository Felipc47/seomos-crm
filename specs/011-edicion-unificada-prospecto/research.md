# Research: Edición unificada del prospecto

## Decisión 1 — Un solo editor compartido

**Decision**: Las tres pantallas abrirán el mismo modal, que carga la ficha
actual directamente antes de permitir guardar.

**Rationale**: Evita que Bandeja, Pipeline y Contactos evolucionen con campos o
validaciones distintas. La carga fresca también impide editar una copia antigua.

**Alternatives considered**:

- Mantener tres formularios equivalentes: descartado por duplicación y riesgo
  de divergencia.
- Redirigir siempre a Contactos: descartado porque rompe el contexto de trabajo.

## Decisión 2 — Operación atómica de contacto y etapa

**Decision**: Ampliar la actualización del contacto para aceptar la etapa y su
motivo, validarlos por organización y aplicar ambos cambios en una transacción.

**Rationale**: Un modal único no debe informar éxito si cambió el nombre pero
falló la etapa, o viceversa.

**Alternatives considered**:

- Dos PATCH consecutivos desde el navegador: descartado por estados parciales.
- Un endpoint nuevo solo para la UI: descartado porque duplicaría reglas del
  recurso de contacto.

## Decisión 3 — Rechazar, no fusionar, teléfonos duplicados

**Decision**: El conflicto dentro de la organización responde 409 y deja el
formulario abierto.

**Rationale**: Fusionar implica decidir qué conversación, consentimiento,
mensajes y lead prevalecen; es una función destructiva distinta que requiere un
flujo explícito.

## Decisión 4 — Conservar campos protegidos fuera del editor

**Decision**: No incluir ficha de IA, baja, consentimiento, archivo, estado del
agente, seguimiento ni metadatos internos.

**Rationale**: La ficha de IA se regenera, los estados de cumplimiento tienen
consecuencias regulatorias y los demás campos poseen controles especializados.
El editor cubre toda la información manual de identidad y gestión comercial.

## Decisión 5 — Identidad estable ante cambio de teléfono

**Decision**: Actualizar únicamente `contact.phone`, sin crear otro contacto.

**Rationale**: Conversación, mensajes y lead referencian `contact.id`; mantener
ese ID conserva el historial. Los futuros mensajes usan el número actualizado.
