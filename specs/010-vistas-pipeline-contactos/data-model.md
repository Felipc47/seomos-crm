# Data Model: Vistas de pipeline y contactos

## Datos de dominio

No se crean ni modifican entidades, tablas o relaciones. Prospectos, etapas,
contactos y conversaciones se consumen desde los DTO y endpoints existentes.

## Preferencia de vista

Estado local no sensible asociado al navegador.

| Campo conceptual | Valores permitidos | Default |
|---|---|---|
| Vista del pipeline | `board`, `list` | `board` |
| Vista de contactos | `list`, `grid` | `list` |

### Reglas

- Las preferencias son independientes.
- Solo se restaura un valor incluido en la lista permitida de su pantalla.
- Ausencia, error de acceso o valor inválido conserva el default.
- Cambiar la preferencia no modifica datos de organización ni dispara red.

## Proyecciones visuales

### Fila de prospecto

Proyección de `BoardLead` + su `StageDto`: identidad, teléfono, etapa, última
actividad, seguimiento, motivo de cierre y conversación disponible.

### Tarjeta de contacto

Proyección de `ContactDto`: identidad, teléfono, etapa, notas, archivo, baja y
acciones existentes.
