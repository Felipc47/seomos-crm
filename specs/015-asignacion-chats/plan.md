# Implementation Plan: Asignación y transferencia de chats

**Branch**: `015-asignacion-chats` | **Date**: 2026-08-02 |
**Spec**: [spec.md](spec.md)

## Summary

Convertir la asignación comercial existente en una herramienta operativa de
Bandeja. El cliente obtendrá el miembro actual y los destinos válidos de la
empresa, podrá filtrar localmente “Asignados a mí” y transferir un chat mediante
un endpoint dedicado que actualiza el responsable del prospecto sin tocar la
conversación ni sus mensajes. El cambio se publica por SSE y notifica de forma
best-effort al destinatario.

## Technical Context

**Language/Version**: TypeScript 5.7 estricto, React 19, Next.js 15 App Router

**Primary Dependencies**: Drizzle ORM, Zod, Tailwind CSS, lucide-react, Better
Auth, SSE y sistema de notificaciones existentes

**Storage**: PostgreSQL existente; reutiliza `lead.assigned_member_id` y sus
índices, sin migración nueva

**Testing**: Vitest, mocks internos y E2E Playwright con dos sesiones

**Target Platform**: Navegadores modernos en móvil/escritorio y contenedor Linux
self-hosted

**Project Type**: Monolito web multi-tenant

**Performance Goals**: Filtrado inmediato sobre la lista cargada; transferencia
en una escritura principal y consultas acotadas, sin N+1

**Constraints**: Misma empresa para chat y destino; no recrear conversación ni
mensajes; notificación no revierte el cambio; Laboratorio excluido; sin
dependencias externas ni migración

**Scale/Scope**: Miles de conversaciones por empresa y equipos actuales de hasta
seis miembros salvo instancia sin límite

## Constitution Check

### Pre-design

- **I Seguridad**: PASS. Conversación, prospecto, miembro y sesión se validan en
  la misma empresa; recursos ajenos responden como inexistentes.
- **II Soberanía**: PASS. Solo usa PostgreSQL, autenticación, SSE y notificaciones
  self-hosted ya existentes.
- **III Multi-tenancy**: PASS. Toda consulta incluye `organization_id`; el destino
  se resuelve dentro de la organización activa.
- **IV Idempotencia**: PASS. Reasignar al responsable actual no crea cambios ni
  alertas duplicadas.
- **V Calidad**: PASS. Incluye unitarias, E2E real con dos sesiones, gate completo
  y regresiones de Bandeja/servicios.
- **VI Specs antes de código**: PASS. Spec, investigación, plan y tareas preceden
  la implementación.
- **VII Trazabilidad**: PASS. Quedan explícitos permisos, “Sin asignar”, ausencia
  de auditoría histórica y semántica de conservación.
- **VIII Foco vertical**: PASS. Organiza la atención humana de conversaciones de
  WhatsApp y prospectos.
- **IX Verificación en vivo**: PASS. El quickstart exige navegador real, SSE,
  historial y caminos infelices.

### Post-design

PASS. La asignación sigue siendo fuente única en el prospecto, el contrato
impide destinos cruzados y la identidad del chat no cambia. La notificación es
secundaria y el refetch por SSE mantiene convergencia sin introducir colas.

## Project Structure

```text
src/
├── app/api/conversations/assignment-options/route.ts
├── app/api/conversations/[id]/assignee/route.ts
├── components/inbox/conversation-list.tsx
├── components/inbox/inbox-client.tsx
├── components/inbox/conversation-transfer-dialog.tsx
├── lib/types.ts
└── server/inbox/assignment.ts

tests/
├── unit/inbox-assignment.test.ts
└── e2e/us28-asignacion-chats.*
```

**Structure Decision**: Extender las fronteras actuales. Un servicio de dominio
centraliza validación tenant, creación mínima de prospecto, actualización,
serialización, SSE y notificación; los route handlers solo validan HTTP. La UI
consume opciones y orquesta filtro/diálogo sin convertirse en frontera de
seguridad.

## Design

1. Definir DTO de miembro asignable y esquema Zod reutilizable para transferencia.
2. Resolver opciones por organización, marcando el `memberId` que corresponde al
   `userId` autenticado; no inferir identidad por nombre o correo.
3. Crear un servicio tenant-safe que cargue conversación real, contacto,
   prospecto y asignación actual; valide el miembro destino dentro de la empresa.
4. Si falta prospecto, crearlo en la primera etapa abierta con la función
   idempotente existente, sin recrear contacto o chat.
5. Actualizar solo `lead.assignedMemberId` y `updatedAt`. Si el destino ya es el
   actual, devolver el DTO sin notificar.
6. Releer y serializar la conversación existente, publicar
   `conversation.updated` y notificar al nuevo usuario cuando sea otra persona.
7. Añadir a Bandeja un selector de responsable con “Todos”, “Asignados a mí” y
   “Sin asignar”, compuesto con pestaña, etapa y búsqueda actuales.
8. Añadir “Transferir chat” al menú de fila y al encabezado del hilo. El diálogo
   muestra el responsable actual, destinos tenant-safe y confirmación bloqueada
   durante la solicitud.
9. En éxito, actualizar estado local, cerrar diálogo y mostrar toast; SSE y
   refetch hacen aparecer/desaparecer el chat en sesiones con filtro personal.

## Complexity Tracking

No hay violaciones constitucionales ni complejidad excepcional. Se evita una
tabla o campo paralelo porque `lead.assigned_member_id` ya representa al
responsable compartido por Bandeja, Contactos y Pipeline.

## Verification Results

- Self-test `us28-asignacion-chats.sh`: **50 verificaciones, 0 fallos** con dos
  sesiones, historial con adjunto, SSE, aislamiento tenant, responsive y teclado.
- Regresiones: `us14` **17/17**, `us25` **37/37**, `us26` **46/46** y `us27`
  **75/75**.
- Gate técnico: typecheck, lint y build de producción exitosos; Vitest
  **36 archivos / 192 pruebas**.
- No se añadió migración ni dependencia de runtime. El servidor local de prueba
  se cerró al terminar.
