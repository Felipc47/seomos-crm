# Implementation Plan: Mailing y automatizaciones

**Branch**: `codex/028-mailing-automation` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

## Summary

Añadir `/mailing` como módulo de email independiente del canal WhatsApp. Datos propios en PostgreSQL, controles de permisos en UI y API, Resend para remitentes DNS y entrega, secuencias locales y outbox persistente procesada por cron existente.

## Technical Context

- Next.js 15, React 19, TypeScript estricto, Tailwind, Zod; no nuevas dependencias runtime.
- Drizzle + PostgreSQL con migración versionada y tablas org-first.
- Resend HTTP aislado en `src/lib/resend/`; preservar adaptador transaccional actual.
- Vitest y Playwright con Chrome y mock interno; BD de prueba aislada, sin reset de datos existentes.
- Hasta 5000 suscriptores por importación, 20 pasos por secuencia y 50 envíos por ciclo. Límite compartido entre procesos mediante lock SQL y ritmo conservador; errores 429 aplazan el trabajo.

## Constitution Check

La solicitud explícita del dueño del 2026-10-08 amplía Resend a marketing y el foco a un módulo independiente de email. Enmienda 2.0.0 registrada antes de código en la constitución y propagada a AGENTS/CLAUDE. Mantener cifrado/secretos runtime, aislamiento, idempotencia y pruebas en vivo. Ningún proveedor externo nuevo.

## Project Structure

- `src/lib/db/schema.ts`, `ids.ts`, `drizzle/`: remitente, suscriptor, lista, pertenencia, programa, inscripción, envío/evento.
- `src/lib/mailing.ts`: validación compartida, tipos y render seguro.
- `src/lib/resend/mailing.ts`: DNS y envío con from explícito; errores sanitizados.
- `src/server/mailing/`: repositorio tenant-safe, inscripciones, dispatcher y webhook.
- `src/app/api/mailing/`: API autenticada; `unsubscribe` y `webhook` con tokens/firma.
- `src/app/(app)/mailing/page.tsx`, `src/components/mailing/`: cuatro vistas (campañas, automatizaciones, audiencia, remitente).
- `src/app/api/cron/sweep/route.ts`: llamar barrido de mailing tolerante a fallos.
- `src/app/api/dev/resend-mock/`: extender con dominios y errores/eventos de prueba, conservando gate 404 en producción.
- `tests/unit/mailing.test.ts`, `tests/e2e/us37-mailing.mjs` y `.md`: verificación.

## Design

Modelo, decisiones y contrato en [data-model.md](data-model.md), [research.md](research.md), [contracts/mailing.md](contracts/mailing.md). Pasos persistidos como JSON validado por Zod; un envío conserva snapshots de remitente/contenido/email e identidad única por campaña/inscripción/paso. Claim por UPDATE condicional con lease; lock de dispatcher global en BD, nunca transacción abierta durante llamadas HTTP. Reintentos dentro de 23h desde primer intento, con límite; luego `uncertain` si no se confirmó. El worker revalida consentimiento, bajas y estado del programa antes de reclamar cada envío.

## Habilitación y despliegue autorizados

`organization.mailing_enabled` boolean NOT NULL default false. Migración habilita solo Seomos existente; nuevas empresas siguen deshabilitadas. Endpoint PATCH exclusivo de superadmin, control en Empresas, lectura vigente desde BD para nav/página/API. Dispatcher filtra habilitadas; toggle comparte advisory lock con envíos y DNS para completar deshabilitación sin envíos en curso. Bajas y reconciliación siguen disponibles. Publicación selectiva conserva cambios locales ajenos.

## Verification

Gate completo: `pnpm typecheck && pnpm lint && pnpm build && pnpm test`; detener dev durante build. E2E en localhost con Resend/WhatsApp/IA mock y reloj virtual solo detrás de dev guard. Ejercer UI real, buzón, DNS pendiente/verificado, aislamiento, inscripción y 7/14/21, pausas, baja y errores/concurrencia. Registrar resultados reales en tasks.
