# Implementation Plan: Restablecimiento seguro de contraseñas

**Branch**: `026-reset-contrasenas` | **Date**: 2026-08-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/026-reset-contrasenas/spec.md`

## Summary

Activar el flujo nativo de tokens de Better Auth para recuperación por correo, con enlaces de un solo uso y vigencia de 60 minutos, revocación de sesiones y entrega mediante el adaptador Resend existente. Añadir pantallas públicas de solicitud y nueva contraseña, y una acción admin por miembro que valida rol y organización antes de iniciar el mismo flujo sin revelar contraseña ni token. Los fallos de correo serán neutros en la superficie pública y accionables para el admin autenticado.

## Technical Context

**Language/Version**: TypeScript 5.7 estricto sobre Node.js 20+

**Primary Dependencies**: Next.js 15, React 19, Better Auth 1.6.23, Drizzle ORM, Zod y adaptador HTTP de Resend existente

**Storage**: PostgreSQL; se reutiliza la tabla `verification` de Better Auth, sin migración nueva

**Testing**: Vitest para plantilla/servicio y Playwright contra el servidor real con mock interno de Resend

**Target Platform**: Contenedor Linux self-hosted en Coolify o Docker Compose

**Project Type**: Monolito web Next.js App Router

**Performance Goals**: Solicitudes locales responden sin espera indefinida; la única llamada externa tiene timeout de 8 segundos; navegación y validación son inmediatas

**Constraints**: tokens y contraseñas nunca se registran ni se exponen al admin; respuesta pública anti-enumeración; aislamiento por organización; límite de tasa; Resend opcional y único proveedor; sesiones previas revocadas al completar

**Scale/Scope**: Varias organizaciones por instancia, equipos pequeños y solicitudes ocasionales de recuperación

## Constitution Check

*GATE inicial y posterior al diseño: PASS.*

- **I Seguridad**: PASS. Better Auth genera y consume el token opaco; solo la persona destinataria lo recibe. Contraseñas y enlaces no aparecen en respuestas admin ni logs.
- **II Soberanía 1.5.0**: PASS. La enmienda aprobada permite Resend para recuperación; no se agrega proveedor ni SDK y el correo sigue tras `src/lib/resend/`.
- **III Multi-tenancy**: PASS. La acción admin resuelve el miembro con `organization_id` de la sesión antes de solicitar cualquier envío.
- **IV Idempotencia**: PASS. Cada token es consumible una vez y el envío usa una clave derivada irreversible del token.
- **V y IX Calidad**: PASS. Se incluyen gate completo y E2E real para recuperación propia, acción admin, sesión revocada, token reutilizado, cruce de tenant y fallo del proveedor.
- **VI Specs**: PASS. Spec y plan preceden el código.
- **VII Trazabilidad**: PASS. Vencimiento, respuesta neutra, permisos, fallos y dependencia aprobada están explícitos.
- **VIII Foco vertical**: PASS. Recuperar accesos permite operar el CRM y gestionar al equipo del negocio.

## Project Structure

### Documentation (this feature)

```text
specs/026-reset-contrasenas/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── password-reset.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── auth/index.ts
├── server/
│   └── email/password-reset.ts
├── app/
│   ├── (auth)/forgot-password/page.tsx
│   ├── (auth)/reset-password/page.tsx
│   └── api/settings/team/[memberId]/password-reset/route.ts
└── components/
    ├── auth/reset-password-form.tsx
    └── settings/team-client.tsx

tests/
├── unit/password-reset.test.ts
└── e2e/
    ├── us34-password-reset.md
    └── us34-password-reset.sh
```

**Structure Decision**: Se mantiene el monolito. Better Auth conserva tokens y credenciales; `server/email` compone la entrega; el route handler aplica permisos multi-tenant; las páginas públicas solo orquestan las APIs de auth.

## Complexity Tracking

No hay violaciones constitucionales ni almacenamiento nuevo. El contexto interno de solicitud diferencia el error accionable de un admin autenticado de la respuesta pública neutra sin alterar el protocolo de tokens.
