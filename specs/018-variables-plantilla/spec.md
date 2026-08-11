# 018 — Variables de plantilla con personalización real

## Objetivo
Que una plantilla pueda llevar **varias variables** (`{{1}}`…`{{5}}`) y que
cada una se llene SOLA con datos del contacto/lead en cada envío — campañas,
saludo de leads, seguimiento automático y envío manual — sin que el operador
escriba valores a mano.

## Diseño de producto
El **mapeo vive en la plantilla**: al crearla, el operador asigna a cada
variable una fuente:

| Fuente | Ejemplo |
|---|---|
| Primer nombre | «Ana» |
| Nombre completo | «Ana Pérez» |
| Teléfono | «573001112233» |
| Correo | «ana@ejemplo.com» |
| Notas | texto de notas del contacto |
| Servicio | nombre del servicio del lead |
| Etapa | etapa del prospecto |
| Valor fijo | texto literal |

Cada variable acepta un **valor de respaldo** opcional para cuando el dato
falte (contacto sin correo, lead sin servicio…).

## Alcance (v1)
- Hasta 5 variables, contiguas desde {{1}} (repetir una misma está bien).
- La resolución ocurre en el SERVIDOR en cada envío, por contacto — una
  campaña de 35.000 produce 35.000 mensajes personalizados distintos.
- Compatibilidad total: las plantillas existentes (sin mapeo, ≤1 variable)
  conservan el flujo actual (campañas con nombre-del-contacto/valor-fijo,
  saludo con primer nombre, input manual en la bandeja).
- El ejemplo que exige Meta al crear/editar se genera desde el mapeo.

## Fuera de alcance
- Variables en el encabezado o botones; campos personalizados definidos por
  el usuario; overrides por campaña (el mapeo de la plantilla manda).

## Criterios de aceptación
1. Crear plantilla con 3 variables mapeadas (primer nombre, servicio, fijo)
   → llega a Meta con `body_text` de 3 ejemplos y queda pendiente.
2. Campaña a 2+ contactos con leads distintos → cada mensaje del outbox
   lleva SUS valores (nombres y servicios diferentes) en 3 parámetros body.
3. Saludo automático de leads y seguimiento usan el mapeo sin cambios de
   configuración; el envío manual desde la bandeja no pide input cuando la
   plantilla está mapeada.
4. Dato faltante SIN respaldo → ese destinatario falla con mensaje claro y
   la campaña continúa (no se pausa); CON respaldo → sale el respaldo.
5. Plantillas legacy (una {{1}} sin mapeo) siguen funcionando igual en
   campañas (modo nombre/fijo) y bandeja (input manual).
6. Validaciones: variables no contiguas ({{1}} y {{3}}), más de 5, mapeo
   incompleto o fijo sin valor → 422 claro sin tocar Meta.
