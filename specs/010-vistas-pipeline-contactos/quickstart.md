# Quickstart: Verificación de vistas CRM

## Precondiciones

- PostgreSQL local iniciado en el puerto de pruebas del proyecto.
- Aplicación iniciada con mocks internos y organización demo.
- Sesión autenticada en el navegador.

## Escenario 1 — Pipeline

1. Abrir `/pipeline` y confirmar que inicia en Tablero sin preferencia previa.
2. Buscar un prospecto conocido y registrar los resultados visibles.
3. Activar Lista y confirmar que se conserva la búsqueda y aparecen los mismos
   prospectos con etapa, teléfono y actividad.
4. Cambiar un prospecto entre etapas abiertas y confirmar el resultado.
5. Elegir No calificado, cancelar el diálogo y confirmar que la etapa no cambia.
6. Repetir, elegir un motivo y confirmar el cambio.
7. Abrir el chat disponible desde la fila.

## Escenario 2 — Contactos

1. Abrir `/contacts` y confirmar que inicia en Lista sin preferencia previa.
2. Activar una búsqueda y un filtro por etapa.
3. Cambiar a Cuadrícula y confirmar que filtros y resultados se conservan.
4. Desde una tarjeta, abrir detalles y edición; comprobar el enlace de chat.
5. Archivar un contacto de prueba y confirmar el resultado observable.
6. Volver a Lista y confirmar que el mismo conjunto permanece.

## Escenario 3 — Persistencia y degradación

1. Elegir Lista en pipeline y Cuadrícula en contactos.
2. Recargar cada ruta y confirmar que restaura su selección independiente.
3. Inyectar un valor de preferencia desconocido, recargar y confirmar los
   defaults Tablero/Lista sin error de consola.
4. Simular un PATCH fallido al mover una etapa desde Lista y confirmar que la
   fila restaura el valor anterior y muestra aviso.

## Matriz responsive y accesible

- Repetir la inspección en 375, 768 y 1440 px.
- Confirmar ausencia de overflow horizontal salvo el Kanban.
- Recorrer ambos selectores con Tab y activarlos con Enter/Espacio.
- Confirmar `aria-pressed` y nombres accesibles en las cuatro opciones.

## Gate técnico

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```
