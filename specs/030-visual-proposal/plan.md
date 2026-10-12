# Plan inicial de la maqueta (sustituido)

1. Revisar marca, estructura y funciones actuales.
2. Crear prototipo React con dependencias ya instaladas. Generar HTML autocontenido con esbuild; fuente y recursos incluidos sin llamadas de red.
3. Crear shell, bandeja y sistema visual comunes; vistas de negocio coherentes con el CRM.
4. Servir solo en 127.0.0.1 y probar navegación, formularios, tema, vacíos y móvil con Playwright.
5. Ejecutar controles técnicos y documentar resultados, distinguiendo fallos preexistentes si aparecen.

Frontera: no tocar src, auth, tenants, schema, proveedores, .env, despliegues ni otras ediciones existentes. No se requieren mocks WA/LLM porque no se llama a esos subsistemas; toda interacción del prototipo usa exclusivamente datos ficticios en memoria.

## Plan vigente: integración local autorizada

1. Inventariar controles reales y preservar su lógica. Preparar BD local aislada y mocks, sin usar credenciales reales.
2. Actualizar tokens globales, fuente local y primitivas; refinar navegación y superficies del agente/bandeja mediante cambios de presentación.
3. Mantener endpoints, permisos, aislamiento, proveedores y lógica de dominio intactos. Conservar cambios ajenos del checkout.
4. Arrancar la app real en loopback. Probar claro por defecto, oscuro persistido, móvil, navegación completa y controles funcionales del agente y CRM.
5. Ejecutar typecheck, lint, build, tests y E2E relevante; dejar evidencia y URL local para revisión. Sin deploy.

## Revisión estructural e interacción

1. Resolver la saturación de conexiones compartiendo un EventSource por pestaña; validar consumidores, reconexión y limpieza con pruebas unitarias y tres pestañas reales.
2. Sustituir la composición conservadora por navegación grafito, lienzo claro, encabezados y herramientas diferenciadas; reorganizar métricas, tablero, contactos, agente y bandeja con las mismas acciones.
3. Usar #E84B1D en acentos compactos, grises neutros y Manrope local; mantener claro inicial y oscuro opcional. Comprobar escritorio y móvil.
4. Ajustar Ayuda a la altura real del compositor y comprobar que no oculte Enviar con borradores multilínea.
5. Compilar una copia idéntica en /tmp/seomos-visual030-build sin compartir .next con el servidor local; ejecutar regresión y documentar evidencia en qa-v2.

## Promoción autorizada

1. Registrar commit e imagen actuales de producción y crear etiqueta de retorno.
2. Aislar el diff030, excluir cambios ajenos y revisar fuente/evidencia antes de publicar.
3. Repetir gates y regresión sobre el conjunto exacto; crear PR y fusionar un único commit reversible.
4. Etiquetar el release, fijar Coolify al SHA integrado y esperar estado final.
5. Verificar HTTPS, recursos, protección de API, mocks cerrados y logs; registrar deployment y reversión en GitHub Release.
