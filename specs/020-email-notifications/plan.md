# Implementation Plan: Notificaciones y resumen semanal por email

**Branch**: `020-email-notifications` | **Date**: 2026-08-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/020-email-notifications/spec.md`

## Summary

Añadir avisos idempotentes por Resend al crear/asignar leads y resúmenes de la última semana completa para responsables y administradores. La integración vive en `src/lib/resend/`; la orquestación y las consultas multi-tenant en `src/server/email/`; una tabla `email_delivery` impide duplicados. El endpoint autenticado `/api/cron/sweep` dispara el resumen semanal junto con los barridos existentes y degrada sin bloquear si el correo no está configurado o falla.

## Technical Context

**Language/Version**: TypeScript 5.7 estricto sobre Node.js 20+

**Primary Dependencies**: Next.js 15, React 19, Drizzle ORM, Zod; API HTTP de Resend mediante `fetch` nativo

**Storage**: PostgreSQL, migraciones Drizzle versionadas

**Testing**: Vitest para unidad/integración y Playwright contra el servidor real con mock interno de Resend

**Target Platform**: Contenedor Linux self-hosted en Coolify o Docker Compose

**Project Type**: Monolito web Next.js con tareas in-process y endpoint de cron autenticado

**Performance Goals**: El aviso no añade más de un request externo por destinatario elegible; el resumen hace consultas acotadas por organización y limita a 20 filas de detalle por email

**Constraints**: multi-tenancy obligatorio; secreto solo en runtime; sin cola externa; idempotencia persistente; fallo de Resend no revierte lead/asignación; cron puede reintentarse

**Scale/Scope**: Varias organizaciones por instancia, equipos pequeños y un resumen semanal por administrador/responsable con actividad

## Constitution Check

*GATE inicial y posterior al diseño: PASS.*

- **I Seguridad**: PASS. `RESEND_API_KEY` solo se lee en servidor; errores persistidos y logs se sanitizan; ningún secreto sale al cliente.
- **II Soberanía 1.4.0**: PASS. Resend fue aprobado exclusivamente para estos correos y se aísla en `src/lib/resend/`; la feature es opcional y tolera fallos.
- **III Multi-tenancy**: PASS. `email_delivery.organization_id` es NOT NULL e indexado org-first; todas las consultas de dominio llevan tenant explícito.
- **IV Idempotencia**: PASS. Clave única local por tipo/lead o período/destinatario más `Idempotency-Key` del proveedor.
- **V y IX Calidad**: PASS. Incluye gate completo, mock del proveedor y E2E feliz/infeliz/deduplicado.
- **VI Specs**: PASS. Spec, plan y tareas preceden el código.
- **VII Trazabilidad**: PASS. Semana, destinatarios, límites y semántica de administrador están documentados.
- **VIII Foco vertical**: PASS. Avisos y resúmenes sirven directamente a la atención y conversión de leads.

## Project Structure

### Documentation (this feature)

```text
specs/020-email-notifications/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── email-delivery.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── db/schema.ts
│   ├── db/ids.ts
│   ├── env.ts
│   └── resend/client.ts
├── server/
│   ├── email/delivery.ts
│   ├── email/new-lead.ts
│   └── email/weekly-digest.ts
├── app/api/cron/sweep/route.ts
└── app/api/dev/resend-mock/
    ├── route.ts
    └── emails/route.ts

tests/
├── unit/email-notifications.test.ts
└── e2e/us30-email-notifications.sh
```

**Structure Decision**: Se mantiene el monolito. El cliente externo queda en `lib`, la política de destinatarios/agregados en `server`, el cron solo orquesta y el mock usa el gate de desarrollo existente.

## Complexity Tracking

No hay violaciones constitucionales ni componentes nuevos fuera de los límites aprobados.
