# Guion E2E — US32: asistente de configuración del agente

Ejecutar `node tests/e2e/us32-agent-config-assistant.mjs` contra una instancia local con base de datos vacía, `WA_MOCK_ENABLED=true` y `OPENROUTER_BASE_URL` apuntando al `ai-mock` interno.

## Camino feliz

1. Registrar el primer usuario de la base aislada y abrir `/agent`.
2. Abrir “Configurar con IA” y confirmar que explica la revisión previa.
3. Describir un negocio sin sitio, elegir el objetivo y agregar límites.
4. Generar el borrador y revisar identidad, tonos, instrucciones y conocimiento.
5. Confirmar por API que la vista previa no persistió cambios.
6. Aplicar el borrador y verificar que rellena los campos sin activar el agente ni persistir.
7. Guardar comportamiento y agregar el bloque con los controles existentes.
8. Recargar y comprobar persistencia.

## Caminos infelices

1. Intentar generar sin sitio ni descripción: validación local accionable.
2. Usar `http://127.0.0.1`: rechazo de seguridad sin quedar cargando.
3. Forzar tres fallos del `ai-mock`: error accionable, respuestas conservadas y reintento disponible.

## Responsive

El guion captura `.impeccable/review/desktop.png` con la propuesta y `.impeccable/review/mobile.png` con el formulario a 375 × 812. En ambos casos verifica ausencia de desbordamiento horizontal y visibilidad de la acción principal.
