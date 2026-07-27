# Implementation Plan: Edición unificada del prospecto

**Branch**: `codex/011-edicion-unificada-prospecto` | **Date**: 2026-07-27 |
**Spec**: [spec.md](spec.md)

## Summary

Crear un diálogo compartido que siempre carga la ficha actual y ampliar el PATCH
de contactos para guardar contacto y etapa en una transacción. Integrarlo en
Bandeja, Pipeline y Contactos, con conflicto 409 para teléfonos duplicados,
motivos de cierre y refresco observable en cada origen.

## Technical Context

**Language/Version**: TypeScript 5.7 estricto, React 19, Next.js 15 App Router

**Primary Dependencies**: Zod, Drizzle ORM, Tailwind CSS, lucide-react

**Storage**: PostgreSQL existente, sin migración

**Testing**: Vitest, Playwright, consultas de verificación y gate completo

**Target Platform**: Navegadores modernos en móvil y escritorio

**Project Type**: Monolito web multi-tenant

**Constraints**: No fusionar contactos; no alterar ficha IA ni cumplimiento;
preservar IDs e historial; operación atómica; sin dependencias nuevas

## Constitution Check

### Pre-design

- **I Seguridad**: PASS. No se exponen secretos ni campos protegidos.
- **II Soberanía**: PASS. No se agregan servicios o dependencias.
- **III Multi-tenancy**: PASS. Contacto, etapa y lead se validan por organización.
- **IV Idempotencia**: PASS. Un reenvío fija los mismos valores y los conflictos
  no producen registros.
- **V Calidad**: PASS. Gate completo y self-test de comportamiento.
- **VI Specs antes de código**: PASS. Artefactos creados antes de implementar.
- **VII Trazabilidad**: PASS. El alcance de “atributos” y campos protegidos queda
  explícito.
- **VIII Foco vertical**: PASS. Mejora el manejo del prospecto conversacional.
- **IX Verificación en vivo**: PASS. Incluye tres vistas, camino infeliz,
  atomicidad y responsive.

### Post-design

PASS. La transacción y el componente compartido reducen divergencia sin ampliar
el modelo ni introducir infraestructura.

## Project Structure

```text
src/
├── app/api/contacts/[id]/route.ts
├── components/contacts/prospect-editor-dialog.tsx
├── components/contacts/contacts-client.tsx
├── components/inbox/contact-panel.tsx
├── components/inbox/inbox-client.tsx
└── components/pipeline/pipeline-client.tsx

tests/e2e/
├── us24-edicion-prospecto.md
└── us24-edicion-prospecto.sh
```

## Design

1. El modal recibe solo el ID y carga contacto, lead, etapa y etapas disponibles.
2. La validación local normaliza el teléfono y exige motivo para etapas
   negativas; Zod repite la validación como autoridad del servidor.
3. El PATCH valida pertenencia de etapa y lead, calcula posición/cierre y ejecuta
   ambas actualizaciones dentro de `db.transaction`.
4. El índice único existente garantiza teléfonos no duplicados; el endpoint
   traduce el conflicto a 409.
5. Tras éxito se publica `conversation.updated` y cada origen ejecuta su refetch.
6. Los formularios parciales de Bandeja y Contactos se reemplazan por el modal.

## Complexity Tracking

No hay violaciones. La ampliación del PATCH existente evita crear un segundo
servicio de escritura para la misma entidad.
