# Implementation Plan: Asignación de servicios a ejecutivos comerciales

**Branch**: `codex/013-asignacion-servicios-ejecutivos` | **Date**: 2026-07-28 |
**Spec**: [spec.md](spec.md)

## Summary

Ampliar el módulo existente de Servicios con un responsable comercial por
servicio. Al ingresar un lead de Meta, la regla vigente se copia al prospecto,
se notifica al usuario responsable y la atribución se expone de forma uniforme
en Bandeja, Pipeline y Contactos. Las asignaciones históricas del prospecto no
dependen de cambios posteriores en la configuración.

## Technical Context

**Language/Version**: TypeScript 5.7 estricto, React 19, Next.js 15 App Router

**Primary Dependencies**: Drizzle ORM, Zod, Tailwind CSS, lucide-react, SSE
existente

**Storage**: PostgreSQL; migración Drizzle versionada con columnas opcionales e
índices org-first

**Testing**: Vitest, mocks internos, E2E Playwright y gate completo

**Target Platform**: Navegadores modernos en móvil y escritorio; contenedor
Linux self-hosted

**Project Type**: Monolito web multi-tenant

**Performance Goals**: La configuración debe responder de forma interactiva y
el enrutamiento no debe añadir más de una consulta acotada y una notificación
al flujo normal de ingreso

**Constraints**: Una asignación por servicio; solo miembros comerciales de la
misma organización; idempotencia por evento leadgen; fallo de notificación no
bloqueante; sin dependencias externas nuevas

**Scale/Scope**: Hasta cientos de servicios y miembros por organización y miles
de prospectos activos sin consultas N+1 en los listados principales

## Constitution Check

### Pre-design

- **I Seguridad**: PASS. Todos los IDs se validan dentro de la organización y
  no se exponen secretos.
- **II Soberanía**: PASS. Se reutilizan PostgreSQL, SSE y el canal Meta ya
  permitido; no hay servicios nuevos.
- **III Multi-tenancy**: PASS. Las columnas viven en tablas de dominio con
  `organization_id`; escrituras y lecturas se filtran por tenant.
- **IV Idempotencia**: PASS. El efecto de asignación y la notificación ocurren
  después del insert único de `leadgen_event`.
- **V Calidad**: PASS. Incluye gate completo, unitarias y E2E de comportamiento.
- **VI Specs antes de código**: PASS. Spec, plan y tareas preceden al código.
- **VII Trazabilidad**: PASS. La copia histórica y el alcance de “le llega”
  están explícitos.
- **VIII Foco vertical**: PASS. Distribuye prospectos de WhatsApp y facilita su
  atención comercial.
- **IX Verificación en vivo**: PASS. Se probarán configuración real, ingreso,
  notificación, permisos, duplicados y responsive.

### Post-design

PASS. La regla de configuración y la copia operativa se separan para evitar
reasignaciones retroactivas; los FKs opcionales degradan de forma segura ante
borrados y todas las consultas nuevas conservan la frontera tenant.

## Project Structure

```text
src/
├── app/api/services/route.ts
├── app/api/services/[id]/route.ts
├── app/api/settings/team/route.ts
├── app/api/settings/team/[memberId]/route.ts
├── app/api/pipeline/board/route.ts
├── app/api/contacts/route.ts
├── components/settings/services-client.tsx
├── components/settings/team-client.tsx
├── components/pipeline/pipeline-client.tsx
├── components/inbox/conversation-list.tsx
├── components/inbox/contact-panel.tsx
├── lib/db/schema.ts
├── lib/types.ts
├── server/inbox/lead-activity.ts
├── server/inbox/queries.ts
└── server/leadgen/ingest.ts

drizzle/
└── 0016_*.sql

tests/
├── unit/service-assignment.test.ts
└── e2e/us26-asignacion-servicios.*
```

**Structure Decision**: Extender las fronteras existentes del monolito. La
configuración pertenece a Servicios, el equipo solo muestra el resumen, y la
ingesta leadgen conserva la autoridad sobre el enrutamiento.

## Design

1. `service.assigned_member_id` representa la regla vigente y acepta `null`.
2. `lead.service_id` y `lead.assigned_member_id` guardan la atribución aplicada
   en el último evento leadgen nuevo de esa oportunidad.
3. El GET de Servicios entrega servicios, responsable y ejecutivos elegibles
   en una sola respuesta; el PATCH valida tenant y rol antes de asignar.
4. Al cambiar un miembro fuera del rol comercial, una transacción libera los
   servicios que tenía configurados sin reescribir prospectos existentes.
5. `onLeadActivity` devuelve el identificador del prospecto creado o existente.
6. La ingesta resuelve servicio y miembro elegible, persiste la copia en el
   prospecto, registra el evento y luego intenta crear una notificación
   navegable. El fallo del aviso se captura sin revertir el lead.
7. Los listados agregan los nombres mediante joins acotados y devuelven un DTO
   común `{ service, assignee }`; las tarjetas muestran chips compactos.
8. La sección Servicios incorpora un selector por tarjeta y la sección Equipo
   muestra los servicios asignados a cada ejecutivo.
9. Las conversaciones directas clasifican sin llamadas adicionales: el turno
   principal puede devolver `serviceId` junto con cualquier acción (incluida
   visión) y la pasada de ficha posterior reintenta con la misma allowlist si
   la IA estaba pausada, en handoff o había omitido la clasificación.
10. La persistencia de la detección es condicional (`service_id IS NULL`) e
    idempotente. Copia el responsable elegible solo si el lead también estaba
    sin responsable, de modo que Lead Ads y las transferencias humanas tienen
    prioridad.
11. La primera aplicación publica `conversation.updated` y notifica al
    ejecutivo; respuestas inválidas, ambiguas o fallos del enriquecimiento no
    interrumpen el turno y se vuelven a intentar con más contexto.
12. `serviceId` deja de ser suficiente por sí solo: tanto el turno principal
    como el enriquecimiento deben devolver una evidencia breve. La frontera de
    persistencia comprueba que provenga del cliente y que no sea saludo,
    identidad ni consulta genérica; solo entonces aplica servicio y responsable.
13. Las evidencias visuales se aceptan únicamente en el turno multimodal que
    contiene la imagen y deben describir una necesidad específica. Audio usa la
    transcripción persistida y sigue la validación textual normal.

## Complexity Tracking

No hay violaciones constitucionales. Las tres columnas opcionales son la mínima
separación necesaria entre una regla mutable y la atribución histórica del
prospecto.

## Verification Results

- Gate técnico completo: `typecheck`, `lint`, `build` y 203 pruebas en 36
  archivos, todo verde.
- E2E US26: 46 verificaciones del flujo de asignación, aislamiento,
  idempotencia, notificación tolerante a fallos, cambios de rol y responsive.
- E2E US29: 34 verificaciones de conversación directa, rechazo de saludo,
  identidad y consulta genérica aun con falso positivo del proveedor,
  necesidad concreta, allowlist, transferencia humana, notificación tolerante
  a fallos, Lead Ads y Bandeja.
- Regresiones: IA reactiva US25 (37/37) y asignación de chats US28 (58/58),
  ambas verdes.
- Revisión interactiva en Chrome: creación de ejecutiva y servicio, asignación
  directa visible en Bandeja, consola limpia y sin overflow.

## Extension 2026-08-02 — clasificación de conversaciones directas

La ampliación no requiere migración ni proveedor adicional. Modifica el prompt
del agente para que conozca el catálogo y extiende el enriquecimiento de ficha
para clasificar el servicio en la misma llamada económica. La verificación
añade ingreso directo, ambigüedad, reintento, transferencia manual, fallo de
notificación y regresión del flujo Lead Ads.

## Correction 2026-08-02 — intención antes de asignación

La allowlist protege el tenant y evita IDs inventados, pero no demuestra que el
cliente haya expresado una necesidad. Se añade un segundo guard independiente
del proveedor: cita verificable del mensaje entrante y señal comercial
específica. Así, una alucinación temprana no se convierte en una atribución
histórica; la clasificación se reintenta naturalmente cuando llega contexto.

Verificación final: US29 34/34, IA reactiva US25 37/37, servicios US26 46/46,
203 unitarias y build de producción verdes.
