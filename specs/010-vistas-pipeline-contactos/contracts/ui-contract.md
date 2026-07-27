# UI Contract: Selectores y vistas

## Selector de vista

- Tiene un nombre accesible específico de la pantalla.
- Contiene una opción por vista disponible.
- Cada opción expone etiqueta visible, icono decorativo y `aria-pressed`.
- Activar una opción actualiza únicamente la presentación y la preferencia.
- El foco de teclado es visible.

## Pipeline

### Tablero

- Es la vista predeterminada.
- Conserva columnas, conteos, drag and drop, búsqueda, alta y gestión de etapas.

### Lista

- Muestra los leads que coinciden con la misma búsqueda.
- Ordena por posición de etapa y luego posición del lead.
- Permite abrir chat cuando existe conversación.
- Permite seleccionar otra etapa.
- Un destino negativo abre el diálogo de motivo antes de guardar.
- Cancelar o fallar conserva la etapa anterior.

## Contactos

### Lista

- Es la vista predeterminada.
- Conserva el diseño y las acciones actuales.

### Cuadrícula

- Usa una columna en móvil y aumenta columnas según el ancho disponible.
- Expone el mismo conjunto filtrado y las acciones de detalle, edición, chat,
  archivo y eliminación.
- No muestra desplazamiento horizontal involuntario.

## Estados compartidos

- Cambiar de vista no limpia búsqueda ni filtros.
- Sin resultados se conserva el estado vacío correspondiente.
- La vista puede restaurarse tras volver a cargar.
- Una preferencia inválida no bloquea el contenido.
