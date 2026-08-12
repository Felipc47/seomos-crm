# Implementation Plan: Sitio público y documentos legales para Google OAuth

**Branch**: `main` | **Date**: 2026-08-12 | **Spec**: [spec.md](spec.md)

## Summary

Reemplazar el redirect de `/` por una landing pública de Seomos CRM y añadir `/privacy` y `/terms` como páginas estáticas server-rendered. Las tres rutas compartirán componentes públicos de encabezado, pie y estructura legal, no consultarán datos de tenant y expondrán claramente el uso limitado de Google Calendar. Login y la navegación autenticada enlazarán los documentos.

## Technical Context

**Language/Version**: TypeScript 5.7, React 19, Next.js 15 App Router

**Dependencies**: Componentes nativos, `next/link`, `next/image` y `lucide-react`; sin dependencias nuevas

**Storage**: Ninguno

**Testing**: typecheck, lint, build, Vitest y Playwright con Chrome sobre servidor local

**Target Platform**: Contenedor Linux en Coolify, dominio `crm.seomos.cloud`

## Constitution Check

- **I Seguridad**: PASS. Contenido estático, sin secretos ni datos de tenant.
- **II Soberanía**: PASS. No introduce dependencias externas de runtime.
- **III Multi-tenancy**: PASS. Las rutas públicas no hacen consultas de dominio.
- **V/IX Calidad**: PASS. Gate completo y navegación E2E anónima, incluido 404.
- **VI Specs**: PASS. Spec, plan y tareas preceden el código.
- **VIII Foco**: PASS. La landing explica el CRM y habilita la verificación de Calendar ya existente.

## Project Structure

```text
src/
├── app/page.tsx
├── app/privacy/page.tsx
├── app/terms/page.tsx
├── app/(auth)/layout.tsx
├── components/app-nav.tsx
└── components/public/public-shell.tsx

tests/e2e/
├── us31-public-legal.md
└── us31-public-legal.mjs
```

## Design Decisions

- La página principal deja de redirigir al inbox; el acceso al producto queda en un CTA a `/login`.
- Los documentos se mantienen dentro del repositorio para que la URL sea estable, verificable y versionada.
- La marca pública es siempre Seomos CRM, coherente con el consentimiento OAuth; no usa el white-label de una organización anónima.
- Los términos y privacidad comparten una plantilla semántica para consistencia y accesibilidad.
