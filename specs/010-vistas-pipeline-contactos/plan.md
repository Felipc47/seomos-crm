# Implementation Plan: Vistas de pipeline y contactos

**Branch**: `codex/010-vistas-pipeline-contactos` | **Date**: 2026-07-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-vistas-pipeline-contactos/spec.md`

## Summary

Añadir un selector de vista reutilizable y accesible. El pipeline conservará el
tablero actual y sumará una lista vertical que permite cambiar etapas; Contactos
conservará su lista y sumará una cuadrícula adaptable. Cada selección se
recordará localmente por pantalla, sin API ni persistencia de dominio nueva.

## Technical Context

**Language/Version**: TypeScript 5.7 estricto, React 19, Next.js 15 App Router

**Primary Dependencies**: Tailwind CSS, lucide-react, @dnd-kit/core existente

**Storage**: PostgreSQL existente sin cambios; preferencia no sensible en
almacenamiento del navegador

**Testing**: Vitest para lógica aislable; Playwright sobre el navegador real para
los flujos de UI; gate `pnpm typecheck && pnpm lint && pnpm build && pnpm test`

**Target Platform**: Navegadores modernos en móvil y escritorio

**Project Type**: Monolito web

**Performance Goals**: Cambiar de vista sin nuevas solicitudes de red y con
respuesta visual menor a 100 ms para los datos ya cargados

**Constraints**: No cambiar API, esquema, reglas de cierre ni permisos; mantener
la interacción táctil del tablero; evitar hidratación dependiente del navegador

**Scale/Scope**: Dos pantallas y cuatro modos visuales sobre el volumen que ya
entregan `/api/pipeline/board` y `/api/contacts`

## Constitution Check

### Pre-design

- **I Seguridad**: PASS. Solo se persiste un identificador de vista no sensible.
- **II Soberanía**: PASS. No se añaden dependencias ni servicios externos.
- **III Multi-tenancy**: PASS. No hay consultas ni datos de dominio nuevos.
- **IV Idempotencia**: PASS. Se reutiliza el PATCH de movimientos existente.
- **V Calidad**: PASS. Incluye gate completo y pruebas de comportamiento.
- **VI Specs antes de código**: PASS. Spec creada antes de implementar.
- **VII Trazabilidad**: PASS. Vistas y defaults no solicitados explícitamente
  quedan documentados como supuestos.
- **VIII Foco vertical**: PASS. Facilita organizar y convertir leads de WhatsApp.
- **IX Verificación en vivo**: PASS. Quickstart exige navegador real, camino
  feliz, persistencia, valor inválido y fallo de movimiento.

### Post-design

PASS sin excepciones. El diseño reutiliza datos y endpoints existentes, mantiene
el aislamiento de organización y no amplía dependencias de runtime.

## Project Structure

### Documentation (this feature)

```text
specs/010-vistas-pipeline-contactos/
├── checklists/requirements.md
├── contracts/ui-contract.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
├── spec.md
└── tasks.md
```

### Source Code

```text
src/components/
├── contacts/contacts-client.tsx
├── pipeline/pipeline-client.tsx
├── ui/view-toggle.tsx
└── use-view-preference.ts

tests/e2e/
├── us23-vistas-crm.md
└── us23-vistas-crm.sh
```

**Structure Decision**: Mantener la arquitectura cliente actual. Un control y un
hook pequeños concentran accesibilidad y persistencia; cada pantalla conserva el
renderizado específico de sus datos y acciones.

## Design

1. `ViewToggle` renderiza un grupo segmentado de botones con icono, etiqueta,
   `aria-pressed`, foco visible y estado activo.
2. `useViewPreference` inicia con el default estable para SSR, restaura una
   opción permitida después de montar y tolera almacenamiento ausente o inválido.
3. Pipeline calcula una sola colección filtrada. Tablero la agrupa por etapa;
   Lista la ordena por posición de etapa y de lead.
4. El selector de etapa de una fila reutiliza `persistMove`; los cierres
   negativos siguen pasando por `LeadClosureDialog`.
5. Contactos reutiliza `visible`. Lista conserva su diseño y Cuadrícula presenta
   las mismas acciones con controles compactos y nombres accesibles.

## Complexity Tracking

No hay violaciones ni complejidad adicional que requiera justificación.
