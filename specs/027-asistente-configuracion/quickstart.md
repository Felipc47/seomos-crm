# Quickstart: verificación del asistente de configuración

## Entorno

Arrancar la aplicación local con PostgreSQL de pruebas y los mocks internos habilitados. `OPENROUTER_BASE_URL` debe apuntar a `/api/dev/ai-mock`; ningún mock puede estar activo en producción.

## Camino feliz con sitio

1. Iniciar sesión como administrador y abrir `/agent`.
2. Abrir “Configurar con IA”.
3. Pegar la URL del fixture HTTP público del guion, elegir “Vender y recomendar” y agregar un límite.
4. Generar la propuesta.
5. Verificar la vista previa y que el formulario original todavía no cambió.
6. Elegir “Usar este borrador”.
7. Comprobar nombre, saludo, dos tonos como máximo, seis secciones, escalado y bloque de conocimiento rellenados.
8. Confirmar que nada se activó ni persistió automáticamente; usar los guardados existentes y recargar para probar persistencia cuando el guion lo indique.

## Camino feliz sin sitio

Repetir dejando URL vacía y describiendo el negocio. La generación debe completar el mismo contrato.

## Caminos infelices

- Probar `http://127.0.0.1`, `http://localhost`, una URL con credenciales y una redirección a IP privada: deben rechazarse sin obtener contenido.
- Forzar tres fallos del mock de IA: el panel deja de cargar, conserva las respuestas y ofrece reintento.
- Cerrar el panel antes de aplicar: los campos actuales permanecen iguales.
- Arrancar sin token de IA: el botón queda deshabilitado y la edición manual continúa disponible.

## Gate

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
```

Después, ejecutar `node tests/e2e/us32-agent-config-assistant.mjs` contra la instancia local y revisar capturas de 1440 px y 375 px.
