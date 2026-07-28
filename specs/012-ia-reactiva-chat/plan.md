# Implementation Plan: IA reactiva desde el chat

**Branch**: `codex/012-ia-reactiva-chat` | **Date**: 2026-07-27 |
**Spec**: [spec.md](spec.md)

## Summary

Centralizar el estado global mínimo del agente en Bandeja, añadir un control
compacto al encabezado y ampliar la activación de conversación para encolar de
inmediato un turno solo cuando el último mensaje siga pendiente. El pipeline
mantiene la autoridad final sobre duplicados, ventana y handoff.

## Technical Context

**Language/Version**: TypeScript 5.7 estricto, React 19, Next.js 15 App Router

**Primary Dependencies**: Zod, Drizzle ORM, Tailwind CSS, lucide-react

**Storage**: PostgreSQL existente, sin migración

**Testing**: Vitest, mocks internos, E2E Playwright y gate completo

**Target Platform**: Navegadores modernos en móvil y escritorio

**Project Type**: Monolito web multi-tenant con turnos IA in-process

**Constraints**: Sin texto libre fuera de 24h, sin respuesta doble, sin exponer
perfil/prompts a roles que solo necesitan operar el chat

## Constitution Check

### Pre-design

- **I Seguridad**: PASS. El nuevo estado solo expone booleanos no sensibles.
- **II Soberanía**: PASS. No se agregan servicios ni dependencias.
- **III Multi-tenancy**: PASS. Conversación, perfil y mensajes se filtran por
  organización.
- **IV Idempotencia**: PASS. Coalescing más revalidación del último mensaje.
- **V Calidad**: PASS. Incluye gate completo y self-test de comportamiento.
- **VI Specs antes de código**: PASS. Artefactos creados antes de implementar.
- **VII Trazabilidad**: PASS. La semántica de “pendiente” queda explícita.
- **VIII Foco vertical**: PASS. Reduce fricción en la operación conversacional.
- **IX Verificación en vivo**: PASS. Incluye caso feliz, duplicado, ventana,
  fallo y responsive.

### Post-design

PASS. La decisión se mantiene en una frontera de dominio multi-tenant, la UI
comparte estado y semántica, y el pipeline conserva la autoridad final. No se
añadieron tablas, dependencias ni servicios externos.

## Project Structure

```text
src/
├── app/api/agent/status/route.ts
├── app/api/conversations/[id]/route.ts
├── components/inbox/ai-conversation-control.tsx
├── components/inbox/contact-panel.tsx
├── components/inbox/inbox-client.tsx
├── server/ai/pending-turn.ts
└── server/ai/pipeline.ts

tests/
├── unit/ai-pending-turn.test.ts
└── e2e/us25-ia-reactiva-chat.*
```

## Design

1. Un endpoint autenticado expone únicamente `enabled` y `aiConfigured`.
2. Bandeja carga ese estado una vez y lo comparte con el encabezado y detalles.
3. Un componente común presenta estado, switch, busy y adaptación móvil.
4. Encender usa `reactivate=true`; apagar usa `aiEnabled=false`.
5. Tras persistir una activación, el endpoint consulta perfil, ventana y último
   mensaje; si sigue entrante, agenda el turno con demora cero.
6. `runAgentTurn` vuelve a consultar estado/historial antes de enviar y conserva
   las protecciones existentes.
7. La respuesta PATCH informa si quedó un turno en cola para dar feedback
   preciso sin bloquear al navegador durante la llamada al LLM.

## Complexity Tracking

No hay violaciones. Un endpoint de estado separado evita exponer la
configuración completa y un helper de dominio evita duplicar la decisión en UI.

## Verification Results

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm build`: PASS.
- `pnpm test`: PASS — 33 archivos, 175 tests.
- `bash tests/e2e/us25-ia-reactiva-chat.sh`: PASS — 37 verificaciones.
- `bash tests/e2e/us24-edicion-prospecto.sh`: PASS — 41 verificaciones de
  regresión.
- Inspección visual interactiva: PASS; control alineado, estado activo/pausado,
  cero overflow y cero errores de navegador.
