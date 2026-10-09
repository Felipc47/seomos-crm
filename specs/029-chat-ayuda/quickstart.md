# Verificación local — Chat de ayuda (029)

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
