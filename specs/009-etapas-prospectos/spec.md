# Especificación 009 — Etapas claras para prospectos

## Objetivo

Reducir el embudo comercial a etapas mutuamente comprensibles, separar los
resultados negativos por calidad del lead y conservar el seguimiento
automático sin convertir cada estado operativo en una columna.

## Etapas canónicas

1. `Nuevo` (`open`)
2. `En calificación` (`open`)
3. `Calificado` (`open`)
4. `Cita agendada` (`scheduled`)
5. `Cliente` (`won`)
6. `No calificado` (`unqualified`)
7. `No convertido` (`lost`)

Las organizaciones pueden seguir creando etapas abiertas adicionales. Las
anclas del sistema (`scheduled`, `won`, `unqualified`, `lost`) no se eliminan.

## Reglas funcionales

- `No calificado` representa spam, contactos equivocados, duplicados o leads
  que no cumplen el perfil.
- `No convertido` representa oportunidades reales que no terminaron en venta.
- Mover manualmente un lead a cualquiera de esas dos salidas exige un motivo.
- Al salir de una etapa terminal se limpia el motivo y la fecha de cierre.
- El seguimiento automático usa `follow_up_due_at` y
  `follow_up_attempts`; no crea ni necesita columnas propias.
- Un lead con seguimiento pendiente permanece en `En calificación` y el
  tablero muestra su estado de seguimiento en la tarjeta.
- Tras dos seguimientos sin respuesta, el lead pasa a `No convertido` con
  motivo `no_response`.

## Migración de datos

| Estado anterior | Estado nuevo |
|---|---|
| Nuevo | Nuevo |
| En conversación | En calificación |
| Interesado | Calificado |
| Agendado | Cita agendada |
| Contactar luego | En calificación, conservando su programación |
| No contestó | En calificación, conservando su programación |
| Cliente | Cliente |
| Perdido | No convertido |
| No interesado | No convertido |

La migración es idempotente, trabaja por organización y no elimina etapas
abiertas personalizadas.

## Criterios de aceptación

- Una organización nueva nace con las siete etapas canónicas, en ese orden.
- Una organización existente conserva todos sus leads tras la consolidación.
- El API rechaza cierres negativos sin motivo o con un motivo incompatible.
- Pipeline y ficha del contacto solicitan el motivo antes de cerrar.
- La IA usa `Calificado` para intención clara de compra y no puede cerrar
  negativamente sin un motivo válido.
- La cita confirmada mueve el lead a `Cita agendada`.
- El seguimiento automático continúa funcionando sin etapas dedicadas.
