# UI Contract: Editor unificado

## Entradas

- Bandeja: botón Editar del panel de detalles.
- Etapas del prospecto: acción Editar en tarjeta y fila.
- Contactos: acción Editar en lista, cuadrícula y panel de detalles.

Todas abren el mismo diálogo accesible “Editar prospecto”.

## Campos

1. Nombre.
2. WhatsApp con código de país.
3. Correo opcional.
4. Etapa del prospecto cuando existe lead.
5. Motivo, visible y obligatorio solo para etapa negativa.
6. Notas.

## Estados

- Cargando: controles inactivos y mensaje de carga.
- Listo: valores frescos traídos del servidor.
- Inválido: explicación junto al formulario y Guardar inactivo cuando se puede
  detectar localmente.
- Guardando: un solo envío, cierre bloqueado y etiqueta “Guardando…”.
- Error remoto: modal abierto, valores intactos y mensaje visible.
- Éxito: modal cerrado, aviso y superficie de origen actualizada.

## Accesibilidad y responsive

- `role="dialog"`, `aria-modal`, título asociado y foco inicial.
- Etiquetas asociadas a todos los controles.
- Escape y Cancelar cierran cuando no se está guardando.
- A 375 px el contenido tiene scroll vertical y las acciones siguen visibles.
