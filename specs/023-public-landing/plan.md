# Implementation Plan: Landing pública robusta de SEOMOS AI CRM

**Branch**: `022-wordpress-forms` (worktree existente) | **Date**: 2026-08-17 | **Spec**: [spec.md](spec.md)

## Summary

Reestructurar la página pública raíz y su shell compartido con una narrativa comercial completa, un mock fiel de la bandeja, explicación del flujo, capacidades, control de IA, seguridad, Calendar y enlaces cruzados hacia `seomos.com`. La implementación será server-rendered, sin estado de cliente ni dependencias nuevas.

## Technical Context

**Language/Version**: TypeScript 5.7, React 19, Next.js 15 App Router

**Dependencies**: `next/link`, `next/image`, `lucide-react` y Tailwind existentes

**Storage**: Ninguno

**Testing**: typecheck, lint, build, Vitest y verificación local de la ruta pública

**Target Platform**: Contenedor Linux/Coolify; fase actual local

## Constitution Check

- **I Seguridad**: PASS. Contenido estático con datos ficticios, sin consultas de tenant.
- **II Soberanía**: PASS. No introduce dependencias externas de runtime.
- **III Multi-tenancy**: PASS. No toca datos ni contexto de organizaciones.
- **V/IX Calidad**: PASS. Gate completo y verificación local del comportamiento público.
- **VI Specs**: PASS. Spec, plan y tareas preceden el código.
- **VIII Foco**: PASS. Todo el contenido se limita a conversaciones, leads, seguimiento y control operativo de WhatsApp.

## Project Structure

```text
src/app/page.tsx
src/app/globals.css
src/app/layout.tsx
src/components/public/public-shell.tsx
public/og.png
specs/023-public-landing/
```

## Design Decisions

- Usar una paleta editorial fría de blanco, gris neutro y grafito, con naranja SEOMOS y morado como acentos. Se excluyen crema, beige y amarillos.
- Representar la bandeja con HTML semántico y datos ficticios para evitar capturas desactualizadas o datos personales.
- Separar “Solicitar una demostración” (SEOMOS.com) de “Iniciar sesión” (instancia CRM).
- Conservar Google Calendar y documentos legales como contenido público prioritario para OAuth.
- No alterar componentes, rutas ni estilos específicos del área autenticada.
- Presentar la oferta pública como servicio gestionado por SEOMOS; no comunicar “self-hosted” en la landing comercial.
