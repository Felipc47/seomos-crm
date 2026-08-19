# Implementation Plan: Créditos de IA por empresa

**Branch**: `025-ai-credits` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-ai-credits/spec.md`

## Summary

Agregar una billetera de créditos aislada por organización y un libro de movimientos idempotente. El saldo se reserva atómicamente antes de llamar al proveedor: 1 crédito por intervención real y 1 por seguimiento contextual. El superadministrador recarga paquetes desde Empresas; los usuarios autorizados ven el saldo en Agente. Sin saldo, el agente entrega a humano y los seguimientos se omiten sin invocar el LLM. Por decisión posterior del dueño, el Laboratorio se retira por completo del producto y sus rutas históricas quedan en 404.

## Technical Context

**Language/Version**: TypeScript estricto, Node.js, React 19, Next.js 15 App Router

**Primary Dependencies**: Drizzle ORM, PostgreSQL, Better Auth, Zod, Vitest, Playwright

**Storage**: PostgreSQL con migración Drizzle versionada

**Testing**: Vitest para reglas/servicio, gate `pnpm typecheck && pnpm lint && pnpm build && pnpm test`, self-test de UI y comportamiento con mocks locales

**Target Platform**: Contenedor Linux self-hosted y navegador moderno

**Project Type**: Monolito web full-stack

**Performance Goals**: Reserva de crédito dentro del camino de una intervención sin una ronda externa; operaciones concurrentes mantienen saldo no negativo

**Constraints**: Sin billing externo, sin nuevos secretos, tenant obligatorio, no llamar al LLM cuando el saldo es insuficiente; conservar el guardarraíl de envío para datos `is_test` históricos

**Scale/Scope**: Una cuenta por organización, movimientos append-only; dos superficies de consumo y dos superficies de consulta/gestión

## Constitution Check

*GATE inicial: PASS. Revisión posterior al diseño: PASS.*

- **I Seguridad**: PASS. No se agregan secretos; recargas solo para superadmin; lectura propia para usuarios autorizados.
- **II Soberanía**: PASS. Todo el control vive en PostgreSQL propio; no se introduce Stripe, billing ni dependencia runtime.
- **III Multi-tenancy**: PASS. Ambas tablas llevan `organization_id` NOT NULL, índice org-first y toda superficie usa el tenant de sesión o autorización de superadmin.
- **IV Idempotencia**: PASS. Cada consumo tiene referencia única por organización y la reserva es atómica.
- **V/IX Calidad y comportamiento**: PASS. Incluye tests de concurrencia/idempotencia, gate completo y self-test feliz/insuficiente sobre UI y mock LLM.
- **VI Specs antes de código**: PASS. Spec, plan y tasks preceden implementación.
- **VII Trazabilidad**: PASS. Precio por unidad, transición de existentes, no vencimiento y política sin reembolso constan en spec/research.
- **VIII Foco vertical**: PASS. Es un guardarraíl del agente WhatsApp por negocio; no crea una plataforma de pagos ni planes.

## Project Structure

### Documentation (this feature)

```text
specs/025-ai-credits/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── lib/db/
│   ├── schema.ts
│   └── ids.ts
├── server/
│   ├── ai/credits.ts
│   ├── ai/pipeline.ts
│   ├── ai/follow-up.ts
│   └── auth/on-signup.ts
├── app/api/
│   ├── admin/companies/route.ts
│   ├── admin/companies/[id]/credits/route.ts
│   └── agent/profile/route.ts
└── components/
    ├── companies/companies-client.tsx
    ├── agent/agent-client.tsx
    └── inbox/contact-panel.tsx

drizzle/
└── 0025_*.sql

tests/
├── unit/ai-credits.test.ts
└── e2e/ai-credits.md
```

**Structure Decision**: Se mantiene el monolito existente. La política y atomicidad se concentran en `src/server/ai/credits.ts`; cada consumidor reserva allí antes de cruzar el adaptador LLM. Las rutas solo autorizan/validan y las UIs consumen esos contratos.

## Complexity Tracking

Sin violaciones constitucionales ni complejidad excepcional que justificar.
