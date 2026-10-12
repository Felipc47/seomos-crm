# Historial de la maqueta inicial

Este bloque documenta la exploración anterior. La entrega vigente es la integración real local al final de este archivo.

- [x] Inspección de marca y funciones actuales.
- [x] Alcance, criterios y plan previo al código.
- [x] Shell y bandeja interactiva.
- [x] Resumen, pipeline, contactos, agente y mailing.
- [x] Tema claro/oscuro y responsive.
- [x] Build y controles técnicos: typecheck, lint, build; 49 archivos / 344 tests aprobados.
- [x] Prueba funcional, errores y capturas en ambos temas/móvil: 32 comprobaciones de bandeja/tema y 48 de vistas complementarias. Cero errores JavaScript o peticiones externas.
- [x] Entrega local preparada en http://127.0.0.1:4317/index.html y solicitada su apertura en panel de Codex; HTML autocontenido y capturas en output/crm-visual-2026-10.

## Resultado

Solo se añadieron los artefactos de propuesta y su especificación. No se modificaron componentes del CRM ni servicios externos. No se desplegó, hizo commit ni push. Los datos y envíos son ficticios.

Las pruebas incluyeron formularios inválidos y duplicados, almacenamiento bloqueado, búsqueda sin resultados, persistencia local durante navegación, actualización de etapas, instrucciones del agente, borradores de mailing y pantallas móviles de 390 px. Se corrigieron el acceso móvil a la ficha, el marcado de no leídos, contraste del texto secundario y el desbordamiento de etiquetas accesibles.

## Revisión: naranja más presente

- [x] Mayor presencia de naranja en navegación, selección, mensajes manuales, botones e hitos visuales de las seis vistas, manteniendo superficies neutras.
- [x] Pares de contraste: #E84B1D / #101114 = 4,90:1; #CF4219 / blanco = 4,72:1.
- [x] Build y lint focalizado aprobados. Repetidas 80 comprobaciones de navegador, todas correctas. Capturas actualizadas y revisión visual de claro, oscuro y móvil.
- [x] Actualizada la pestaña local existente. Ningún despliegue.

## Corrección vigente: acento elegante y sutil

La revisión anterior fue rechazada por exceso de saturación; queda sustituida.

- [x] Confirmado #E84B1D en src/lib/branding.ts y CSS corporativo ui.css.
- [x] Eliminados rellenos naranjas de navegación, avatar, mensajes y tarjetas; recuperada la base neutral.
- [x] Indicadores de 2 px e iconos puntuales en naranja; acciones principales grafito. Mismo naranja base en ambos temas.
- [x] Build y lint focalizado correctos; 80 comprobaciones de navegador repetidas y aprobadas, capturas actualizadas.
- [x] Revisadas visualmente bandeja clara/oscura y pipeline. Pestaña local actualizada, sin despliegue.

## Integración en el CRM real local (autorizada)

- [x] Inventario funcional del agente y demás módulos.
- [x] Entorno local aislado con datos ficticios y mocks.
- [x] Tokens de color, Manrope local, primitivas y claro por defecto.
- [x] Navegación completa y presentación del agente/bandeja sin reducir opciones.
- [x] Typecheck, lint, build y tests: 50 archivos / 410 tests aprobados, repetidos después del último ajuste móvil. Build verificado sobre copia exacta del código para no compartir `.next` con el servidor de revisión.
- [x] E2E real: 185 comprobaciones aprobadas; 18 rutas de escritorio, siete rutas móviles, formularios/persistencia, errores, ayuda y claro/oscuro. Sin excepciones, respuestas 5xx inesperadas ni solicitudes externas del navegador.
- [x] Capturas revisadas después de esperar datos y transiciones. Ayuda móvil se adapta a la altura real del compositor sin tapar Enviar, verificado a 375 y 390 px con texto multilínea.
- [x] Evidencia y entrega del CRM real local en http://127.0.0.1:3100/agent; healthcheck correcto y pestaña abierta en claro. Sin despliegue.

Evidencia vigente: `output/crm-visual-2026-10/qa-real/result.json`, `help-mobile-layout.json`, `stable-captures.json`, `verification.md`, capturas, `build.log` y `unit-tests.log`. Datos y proveedores de prueba exclusivamente locales.

## Revisión estructural e interacción entre pestañas

- [x] Reproducir y aislar bloqueo SSE: cuatro conexiones por pantalla; segunda pestaña no carga hasta cerrar la primera.
- [x] Compartir SSE por pestaña conservando eventos, consumidores, reconexión y cleanup; nueve pruebas unitarias focalizadas.
- [x] Rediseñar composición del shell, dashboard, pipeline, contactos, agente y bandeja; armonizar módulos restantes.
- [x] Verificar varias pestañas, tiempo real y controles del CRM: 52 comprobaciones, tres pestañas con un SSE cada una, cambios reflejados en 213–369 ms y cleanup completo.
- [x] Revisar escritorio, móvil y ambos temas; ejecutar gates finales y entregar solo local. Typecheck, lint y build aprobados; 51 archivos / 419 tests. Regresión actual: 164 comprobaciones (18 rutas de escritorio y siete móviles) más 14 de eliminación KB; ocho casos de geometría Ayuda/compositor. Evidencia en qa-v2.

La regresión actual se completó en dos tramos: el primer recorrido de escritorio terminó correctamente y luego venció una espera de eliminación de KB durante compilaciones del servidor dev. Se conservó esa interrupción, se comprobó que la API había eliminado las entradas y se completaron los controles pendientes. La repetición focalizada confirmó DELETE 200 en 1182 ms y retirada visual en 1245 ms sin recarga. No se reutilizaron los 185 resultados de la entrega anterior. Proveedores simulados; sin despliegue.

## Release autorizado

- [x] Identificar producción 1842682 saludable, imagen retenida y destino Coolify.
- [x] Aislar 030 y excluir modificaciones ajenas; revisión AST sin bloqueantes.
- [x] Repetir gates y E2E del paquete selectivo: 419 tests y 164 comprobaciones en una corrida nueva, sin errores.
- [ ] Publicar PR y etiquetas de punto anterior/release.
- [ ] Desplegar SHA integrado y comprobar producción.
- [ ] Registrar SHA, deployment, pruebas y rollback en GitHub Release.
