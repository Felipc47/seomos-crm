# Verificación local — Chat de ayuda (029)

## Ampliación del 2026-10-12 — 98 funciones documentadas
- Catálogo ampliado y auditado contra pantallas/contratos en `coverage.md`: 98 guías por tareas, índice de Funciones del CRM con búsqueda y filtro por sección, requisitos/pasos/resultados y restricciones de acceso.
- Gate final: `pnpm typecheck && pnpm lint && pnpm build && pnpm test` verde, 50 archivos / 409 pruebas. Registro `.artifacts/us40-help-coverage/technical-gate.log`.
- Unidades de selección/acceso: `help-coverage.test.ts` + `help-assistant.test.ts`; preguntas de todos los módulos, intenciones de importación/exportación, lectura/configuración de métricas y respuestas conocidas sin proveedor.
- E2E US40: 39 comprobaciones verdes. Descarga real de `contactos.csv` mediante clic del usuario, seis columnas/BOM UTF-8, archivados incluidos pese al filtro, aislamiento bidireccional por empresa; importación real con creado/duplicado/línea inválida, sin permiso inventado; índice local sin proveedor, roles y móvil.
- E2E US39: 42 comprobaciones verdes; US38: 68. Total 149 comprobaciones de comportamiento en los tres guiones.
- QA de capturas desktop y móvil: `.artifacts/us40-help-coverage/desktop-export-control.png`, `mobile-function-index.png`, `mobile-export-control.png`; resultado en `result.json`. CSV generado solo con contactos de prueba en la base local aislada.
- Intenciones claras se responden desde la documentación autorizada. Consultas abiertas conservan el adaptador y fallback; el índice se filtra según sesión, rol y habilitación de Mailing. Navegación normal conserva sus efectos habituales (por ejemplo, abrir Notificaciones marca sus avisos como leídos); Ayuda no pulsa controles ni ejecuta escrituras de negocio.
- No se modifican tablas, proveedores, dependencias, credenciales ni el agente de WhatsApp. El catálogo no contiene datos de clientes y solo enumera funciones existentes; no inventa exportación de suscriptores de Mailing ni carga de logo en Marca.
- Estado: verificado localmente; pendiente de finalizar publicación y QA público de la ampliación.

## Revisión del 2026-10-11/12 — Aprender en la pantalla
- Gate técnico: typecheck, lint, build y 49 archivos / 344 pruebas unitarias verdes.
- `BASE_URL=http://localhost:3100 node tests/e2e/us39-help-tours.mjs`: 42 comprobaciones verdes en el cierre del 2026-10-12. Ejercicio real: seleccionar un chat, señalar el interruptor exacto, pausa mediante clic del usuario, comprobación del estado y conservación de la IA del segundo chat. También estado ya pausado, control ausente, IA no disponible (incluido agente general apagado con pausa guardada), pregunta/retoma, navegación, Escape, privacidad del contexto y móvil.
- `BASE_URL=http://localhost:3100 node tests/e2e/us38-help-chat.mjs`: 68 comprobaciones verdes. Incluye la guía de Automatizaciones de Mailing junto a permisos, fallos del proveedor y red, formato inesperado y aislamiento originales.
- Evidencia en `.artifacts/us39-help-tours/`: `result.json`, `desktop-pause-control.png`, `desktop-paused-confirmed.png`, `desktop-profile-control.png`, `mobile-pause-control.png`, `mobile-unavailable.png`. Revisión visual del resaltado preciso y coach compacto en 1440×1000 y 390×844.
- Base local nueva y aislada `seomos_help_guided_029` en PostgreSQL :5433. Usa los mismos overrides de mocks de abajo y secretos locales de prueba. El guion de tours deja acabar el debounce de los entrantes con el agente apagado antes de preparar los chats; así evita que un handoff automático compita con el clic que está probando.
- Pausa/reactivación y atención humana usan orientación determinista con el nombre real del control, sin llamadas al proveedor. Otros temas conservan el adaptador y su fallback.
- No se añaden tablas, migraciones, dependencias ni credenciales. El contexto enviado al asistente se limita a estados enumerados; no contiene nombres, teléfonos, IDs de conversaciones ni mensajes de WhatsApp.
- Publicación inicial de la mejora: commit `525badb`, deployment `8l0gsyuce9cmxfpglsxtc9cm` terminado con éxito (08m 11s) el 2026-10-11; confirmado el 2026-10-12 por Coolify y healthcheck público `{"ok":true}` HTTP 200. Corrección final de la prioridad del estado de IA en verificación antes de una segunda actualización.

## Resultado del 2026-10-09
- `pnpm typecheck && pnpm lint && pnpm build && pnpm test`: verde; 49 archivos, 341 pruebas (10 específicas del chat).
- `BASE_URL=http://localhost:3100 node tests/e2e/us38-help-chat.mjs`: 65 comprobaciones verdes, en dos ejecuciones completas.
- QA visual de escritorio 1440×1000 y móvil 390×844, temas claro y oscuro: panel legible, contenido y controles dentro del viewport.
- Sin errores de ejecución del navegador. Sin envíos de WhatsApp ni modificaciones del perfil del agente comercial.
- Evidencia: `.artifacts/us38-help-chat/result.json`, `desktop-inbox.png`, `desktop-mailing.png`, `mobile-mailing.png`, `mobile-welcome.png`, `desktop-dark.png`.
- Estado: implementación local lista; no publicada ni probada contra un proveedor real de IA en esta sesión. La prueba usa el adaptador real del CRM contra el mock interno.

## Reproducir
Usar una base PostgreSQL de pruebas vacía/aislada. En esta sesión se creó `seomos_help_029` en el PG local existente (:5433), sin modificar otras bases. Aplicar las migraciones con `DATABASE_URL` apuntando a esa base y `pnpm db:migrate`. Preparar las variables obligatorias de autenticación/cifrado con valores locales de prueba (guía en `.env.example`).

Arrancar Next en :3100 con estos overrides; **todos los proveedores deben apuntar a mocks locales**:
```sh
APP_BASE_URL=http://localhost:3100 \
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/seomos_help_029 \
WA_MOCK_ENABLED=true \
META_GRAPH_BASE_URL=http://localhost:3100/api/dev/wa-mock/graph \
OPENROUTER_API_TOKEN=test-token \
OPENROUTER_MODEL=help-mock \
OPENROUTER_JUDGE_MODEL=help-mock \
OPENROUTER_BASE_URL=http://localhost:3100/api/dev/ai-mock \
RESEND_API_KEY=re_test \
RESEND_FROM_EMAIL=help@example.test \
RESEND_BASE_URL=http://localhost:3100/api/dev/resend-mock \
pnpm dev --port 3100
```
En otra terminal ejecutar el guion E2E. Crea el primer admin de prueba, usuarios de roles y una empresa secundaria; solo admite localhost. Necesita Chrome instalado. Las solicitudes de setup llevan `Origin`, requerido por la versión actual de Better Auth.

Detener el servidor dev antes de `pnpm build`: ambos usan `.next`. Para pruebas específicas usar `pnpm test tests/unit/help-assistant.test.ts`; en este entorno `pnpm exec` intenta descargar/verificar otra versión de pnpm y falló con la red restringida.

## Alcance verificado
Preguntas libres y sugeridas, contexto de pantalla, continuidad, reset, cierre y foco, enlace a Perfil, cambio de pantalla, recuperación de conexión, tres fallos de proveedor, JSON no válido y JSON envuelto, rechazo de guía administrativa inventada, Mailing por rol y habilitación de empresa, API sin sesión, inputs inválidos, límite de 12 solicitudes/minuto por usuario/empresa y conservación del comportamiento comercial.

## Límites conocidos
Las 23 guías son documentación versionada del producto; al cambiar pantallas o controles, actualizar `src/lib/help-guides.ts`. El límite de solicitudes es por proceso y no constituye una cuota compartida entre réplicas. El historial vive en memoria y se pierde al recargar o abandonar el layout autenticado. Los pasos y enlaces proceden del catálogo; la explicación de IA se valida por formato y se instruye a ceñirse al catálogo. No hay herramientas de ejecución ni acceso a registros de clientes.
