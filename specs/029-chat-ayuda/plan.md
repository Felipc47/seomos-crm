# Plan: Chat de ayuda

## Arquitectura
Next.js/React/TypeScript y estilos existentes. Componente global `src/components/help/help-chat.tsx` en el layout autenticado. Catálogo compartido sin datos privados en `src/lib/help-guides.ts`; selección por permisos y búsqueda por términos. Servicio `src/server/ai/help-assistant.ts` usa exclusivamente `chatJson` con Zod y tres intentos de hasta 6 s cada uno; fallback de guías locales. Ruta `POST /api/help/chat` usa `withAuth`, límites Zod y limitador por usuario/empresa de 12 solicitudes/minuto. Mailing se verifica en BD con el helper existente y `scoped()`.

## Contrato
Entrada: `{ question: string (1..1000), pathname: string (hasta 100), history: [{role: user|assistant, content: string (1..1600)}] (máximo 6) }`. Nunca acepta rol/empresa del cliente. Salida: `{ answer: string, guides: [{id,title,href,steps}], mode: ai|guide, notice: string|null }`. La IA devuelve IDs, nunca URLs; el servidor resuelve únicamente IDs de las guías autorizadas. 401 sin sesión; 422 inválido; 429 límite alcanzado.

## Constitution Check
I: sin secretos ni datos de clientes en el prompt; sin logs del prompt/respuesta. II: único proveedor existente, opcional. III: sin tablas nuevas, lectura de habilitación con `scoped()`, permisos server-side. IV: sin mutaciones ni envíos. V/IX: gate técnico y Playwright local con mocks, incluyendo caminos infelices. VI: spec previa al código. VII: supuestos y coste anotados. VIII: guías de Mailing solo para empresas habilitadas. Conforme antes y después del diseño.

## Datos y privacidad
Sin migraciones ni almacenamiento persistente. El historial desaparece al recargar/cerrar sesión; cerrar el panel conserva estado. Solo ruta conocida, rol y mensajes escritos en Ayuda viajan al proveedor. No inspecciona DOM ni recoge contenidos de formularios. React representa respuestas como texto; enlaces y pasos proceden del catálogo.

## Verificación
Unitarias para selección, aislamiento, rutas inventadas y fallos/salida del proveedor. E2E con base local aislada, Meta/IA mocks, Chrome: escritorio/móvil, navegación, contexto, foco, red fallida, fallo proveedor y roles de dos empresas. Evidencia `.artifacts/us38-help-chat/`. Detener dev antes de build para no compartir `.next`.

## Secuencia
Catálogo → servicio/ruta → chat/layout → mocks y tests → gates → E2E y QA visual → actualizar estado. Implementación directa del flujo SDD; no se ejecutan scripts PowerShell no disponibles. No commit automático de cambios ajenos.
