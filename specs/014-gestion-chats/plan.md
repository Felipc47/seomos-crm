# Implementation Plan: Gestión y moderación de chats en Bandeja

**Branch**: `014-gestion-chats` | **Date**: 2026-08-02 |
**Spec**: [spec.md](spec.md)

## Summary

Extender Bandeja con acciones individuales y selección masiva para eliminar
conversaciones, bloquear/desbloquear destinatarios y registrar reportes. El
bloqueo vive en contacto, se sincroniza mediante el adaptador Meta existente y
se aplica como guardia central a IA y a todos los caminos de salida. Los
reportes son eventos auditables internos porque Meta no publica un endpoint
equivalente.

## Technical Context

**Language/Version**: TypeScript 5.7 estricto, React 19, Next.js 15 App Router

**Primary Dependencies**: Drizzle ORM, Zod, Tailwind CSS, lucide-react, SSE y
cliente Meta Graph existentes

**Storage**: PostgreSQL; columnas de bloqueo en `contact` y tabla tenant-first
append-only para reportes, mediante migración Drizzle versionada

**Testing**: Vitest, mocks internos, E2E Playwright y gate completo

**Target Platform**: Navegadores modernos en móvil/escritorio y contenedor
Linux self-hosted

**Project Type**: Monolito web multi-tenant

**Performance Goals**: Operaciones locales de hasta 100 conversaciones sin N+1
en listados; una llamada Meta acotada por lote cuando el contrato lo permita

**Constraints**: Contactos bloqueados nunca alcanzan IA ni salida; bloqueo
fail-closed; desbloqueo solo tras éxito remoto; reportes no se envían a Meta;
laboratorio aislado; sin colas ni dependencias externas nuevas

**Scale/Scope**: Miles de conversaciones por organización y acciones explícitas
de hasta 100 conversaciones visibles por solicitud

## Constitution Check

### Pre-design

- **I Seguridad**: PASS. Errores externos se sanitizan y toda acción se filtra
  por organización; no se exponen credenciales.
- **II Soberanía**: PASS. Solo se reutiliza WhatsApp Cloud API mediante el
  adaptador existente y PostgreSQL local.
- **III Multi-tenancy**: PASS. El reporte lleva `organization_id` NOT NULL e
  índices org-first; todas las consultas usan alcance tenant.
- **IV Idempotencia**: PASS. Bloquear/desbloquear son estados repetibles y los
  lotes deduplican IDs; la ingesta posterior conserva su deduplicación.
- **V Calidad**: PASS. Incluye unitarias, E2E, gate completo y regresión.
- **VI Specs antes de código**: PASS. Spec, investigación, plan y tareas se
  cierran antes de modificar código.
- **VII Trazabilidad**: PASS. Quedan documentadas semántica de eliminación,
  reporte interno y estrategia fail-closed.
- **VIII Foco vertical**: PASS. Modera y organiza conversaciones del canal.
- **IX Verificación en vivo**: PASS. UI, API, mock Graph y todos los caminos de
  salida se ejercen de punta a punta.

### Post-design

PASS. El estado duradero se ubica en contacto, la auditoría en una tabla propia
y el chat sigue siendo eliminable/recreable. El adaptador Meta queda aislado y
las guardias servidoras evitan depender de la UI.

## Project Structure

```text
src/
├── app/api/conversations/[id]/route.ts
├── app/api/conversations/bulk/route.ts
├── app/api/dev/wa-mock/graph/[...path]/route.ts
├── components/inbox/inbox-client.tsx
├── components/inbox/conversation-list.tsx
├── components/inbox/conversation-actions-dialogs.tsx
├── lib/db/schema.ts
├── lib/meta/client.ts
├── lib/types.ts
├── server/ai/pipeline.ts
├── server/ai/follow-up.ts
├── server/campaigns/audience.ts
├── server/inbox/moderation.ts
├── server/inbox/queries.ts
├── server/inbox/send.ts
├── server/whatsapp/blocked-users.ts
└── server/whatsapp/templates.ts

drizzle/
└── 0017_*.sql

tests/
├── unit/chat-moderation.test.ts
└── e2e/us27-gestion-chats.*
```

**Structure Decision**: Extender las fronteras existentes. El dominio de
moderación coordina persistencia y eventos; Meta permanece tras el adaptador de
WhatsApp; cada productor de IA o mensajes conserva una guardia servidora; la
UI de Bandeja solo orquesta selección y confirmaciones.

## Design

1. Añadir estado de bloqueo y sincronización a `contact`; añadir
   `contact_report` append-only con tenant, actor y conversación de origen.
2. Serializar bloqueo y último reporte en el DTO de Bandeja mediante joins
   acotados/subconsulta, sin consultar por fila.
3. Crear `blocked-users.ts` para POST/DELETE del endpoint oficial
   `block_users`, usando `getCredentialsByOrg`, `graphRequest` y teléfono
   normalizado.
4. Crear un servicio de moderación tenant-safe que valide lotes, elimine
   conversaciones, bloquee fail-closed, desbloquee tras éxito y cree reportes
   en transacción.
5. Agregar `DELETE /api/conversations/[id]` y `POST
   /api/conversations/bulk`, ambos con Zod, límite 100 y SSE.
6. Aplicar guardia `blockedAt` en el resolvedor central de envío, plantillas,
   audiencia de campañas, seguimientos y entrada al pipeline IA. La UI no es
   una frontera de seguridad.
7. Extender el mock Graph con lista de bloqueados y fallos controlables para
   verificar happy/unhappy paths sin tocar Meta real.
8. Añadir modo selección, checkboxes y barra contextual responsive; el menú de
   fila mantiene acciones rápidas. Usar diálogos con confirmación y un diálogo
   de reporte con motivo/notas y aclaración de alcance interno.
9. Refrescar selección, conversación activa y lista vía respuesta local + SSE;
   mostrar bloqueo/reportes y reemplazar compositor si corresponde.

## Complexity Tracking

No hay violaciones constitucionales. La tabla de reportes es necesaria para
auditoría histórica; las columnas de contacto representan estado actual y
evitan acoplar bloqueo a una conversación eliminable.

## Verification Results

- Gate técnico: `pnpm typecheck`, `pnpm lint`, `pnpm build` y `pnpm test`
  verdes; 35 archivos y 188 pruebas Vitest aprobadas.
- Comportamiento principal: `tests/e2e/us27-gestion-chats.sh` verde con 75
  verificaciones sobre eliminación, selección masiva, aislamiento tenant,
  bloqueo Meta fail-closed, reintento, desbloqueo, reporte y guardias de salida.
- Regresiones: Bandeja 17/17, IA reactiva 37/37, campañas 26/26 y seguimientos
  34/34. El fixture de campañas ahora elige una etapa abierta porque las etapas
  negativas requieren motivo de cierre.
- UI real con Chrome/Playwright: 375, 768 y 1440 px sin overflow horizontal,
  controles operables con teclado y consola/página sin errores.
- Migración Drizzle `0017_gray_tempest.sql` generada y revisada; el build de
  producción incluye `DELETE /api/conversations/[id]` y
  `POST /api/conversations/bulk`.
