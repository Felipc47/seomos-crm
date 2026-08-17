# Implementation Plan: Bandera de país en la bandeja

**Branch**: `working-tree` | **Date**: 2026-08-17 | **Spec**: `specs/024-banderas-pais-bandeja/spec.md`

## Summary

Resolver el país de un número internacional al serializar la conversación, usando metadatos locales de telefonía, y envolver el avatar existente con un badge exclusivo de Bandeja. El cliente recibe el país ya resuelto; las demás superficies conservan el avatar actual y no cargan los metadatos telefónicos.

## Technical Context

**Language/Version**: TypeScript estricto, React 19, Next.js 15

**Primary Dependencies**: `libphonenumber-js/min` con metadatos locales, `Intl`, Tailwind CSS

**Storage**: N/A; sin migraciones ni persistencia nueva

**Testing**: Vitest + Playwright sobre el flujo real de bandeja con mocks internos

**Target Platform**: Navegadores modernos, diseño responsive móvil y escritorio

**Project Type**: Monolito web Next.js

**Performance Goals**: Resolución síncrona y memoizada por render; sin requests adicionales

**Constraints**: Mantener la esquina inferior derecha del avatar para el estado existente; degradar silenciosamente ante teléfonos inválidos; no alterar otras superficies.

**Scale/Scope**: Un helper puro, un componente compartido, tres usos en Bandeja, tests unitarios y un guion E2E acotado.

## Constitution Check

- **I Seguridad**: pasa; usa únicamente el teléfono ya entregado a la bandeja y no registra datos.
- **II Soberanía**: pasa; metadatos empacados localmente, sin servicio ni request externo.
- **III Multi-tenancy**: no aplica; no hay acceso nuevo a datos.
- **IV Idempotencia**: no aplica; presentación determinista sin efectos.
- **V/IX Calidad**: requiere gate completo y comportamiento real feliz/inválido en Playwright.
- **VI Specs antes de código**: pasa con `spec.md`, este plan y `tasks.md` previos a implementación.
- **VII Trazabilidad**: se documenta que la bandera corresponde al número, no a geolocalización.
- **VIII Foco vertical**: pasa; acelera la atención contextual de conversaciones de WhatsApp.

## Project Structure

```text
src/
├── components/inbox/inbox-contact-avatar.tsx
├── components/inbox/conversation-list.tsx
├── components/inbox/inbox-client.tsx
├── components/inbox/contact-panel.tsx
├── lib/phone-country.ts
├── lib/types.ts
└── server/inbox/queries.ts
tests/
├── unit/phone-country.test.ts
└── e2e/us33-banderas-pais-bandeja.sh
specs/024-banderas-pais-bandeja/
├── spec.md
├── plan.md
└── tasks.md
```

**Structure Decision**: La inferencia vive en `src/lib` como lógica pura y se ejecuta en el serializador servidor de conversaciones. El wrapper visual vive dentro de Bandeja, por lo que el navegador no descarga metadatos telefónicos y otras rutas no cambian.

## Verification Design

1. Unitarios: Colombia, México, España, Estados Unidos, Canadá y territorios con prefijo compartido, tolerancia de formato y entradas no válidas.
2. E2E feliz: crear entrantes de varios países, abrir `/inbox`, comprobar bandera/nombre en filas y chat seleccionado.
3. E2E infeliz: crear un teléfono imposible directamente en datos de prueba, comprobar avatar sin badge y consola limpia.
4. Visual: capturas en 375, 768 y 1440 px, claro/oscuro en una inspección agrupada.
5. Gate: `pnpm typecheck && pnpm lint && pnpm build && pnpm test`.

## Complexity Tracking

Sin violaciones constitucionales ni complejidad excepcional.
