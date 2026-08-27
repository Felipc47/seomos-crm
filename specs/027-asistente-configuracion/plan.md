# Implementation Plan: Asistente de configuración del agente

**Branch**: `027-asistente-configuracion` | **Date**: 2026-08-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/027-asistente-configuracion/spec.md`

## Summary

Añadir un flujo guiado dentro de `/agent` que recibe una URL pública opcional y tres respuestas cortas, obtiene de forma segura texto acotado de una sola página y usa el adaptador LLM existente para producir un borrador tipado. La UI permite revisar y aplicar el borrador al estado local de los formularios actuales; guardar o activar continúa siendo una acción explícita del administrador.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 20+, React 19

**Primary Dependencies**: Next.js 15 App Router, Zod 3, Lucide React, adaptador LLM OpenRouter-compatible existente

**Storage**: PostgreSQL/Drizzle existente; no se agregan entidades ni migraciones

**Testing**: Vitest para validación/lector/generador; Playwright contra mocks para el flujo observable

**Target Platform**: Aplicación web responsive self-hosted

**Project Type**: Monolito web Next.js

**Performance Goals**: validación local inmediata; lectura web acotada a 10 s y 200 KB; generación total con límite inferior al objetivo observable de 65 s

**Constraints**: TypeScript estricto, sin nueva dependencia externa de runtime, SSRF bloqueado en conexión y redirecciones, salida LLM tipada con reintentos, sin persistencia automática

**Scale/Scope**: una ruta API, un servicio de lectura, un generador de borradores y un slide-over integrado en la pantalla existente

## Constitution Check

*GATE inicial y posterior al diseño: PASS.*

- **I Seguridad**: la ruta exige sesión/permiso; el lector solo conecta a direcciones públicas validadas y no expone secretos.
- **II Soberanía**: se reutiliza el único adaptador LLM permitido; leer una URL aportada por el usuario no introduce proveedor ni dependencia persistente.
- **III Multi-tenancy**: no se consulta ni persiste dato de otra organización; el endpoint hereda la sesión y el permiso de `/agent`.
- **IV Idempotencia**: no hay evento externo ni efecto persistente en generación; repetir produce únicamente otro borrador temporal.
- **V/IX Calidad**: se incluyen unit tests, gate completo y E2E de éxito, cancelación, URL insegura y fallo del proveedor.
- **VI Specs antes de código**: spec, plan y tareas preceden la implementación.
- **VII Trazabilidad**: los supuestos de una sola página, cuatro entradas y no consumo de créditos operativos quedan documentados.
- **VIII Foco vertical**: la feature reduce fricción para configurar el agente que atiende prospectos de WhatsApp.

## Project Structure

### Documentation (this feature)

```text
specs/027-asistente-configuracion/
├── checklists/requirements.md
├── contracts/config-assistant.openapi.yaml
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
├── spec.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/api/agent/config-assistant/route.ts
├── components/agent/
│   ├── agent-client.tsx
│   └── agent-setup-assistant.tsx
└── server/ai/
    ├── config-assistant.ts
    └── website-reader.ts

tests/
├── e2e/us32-agent-config-assistant.mjs
├── e2e/us32-agent-config-assistant.md
└── unit/agent-config-assistant.test.ts
```

**Structure Decision**: extensión vertical del monolito existente; el límite de red vive en servidor, el proveedor se consume desde `server/ai`, el contrato HTTP queda en App Router y la experiencia se integra en los componentes actuales.

## Complexity Tracking

No hay violaciones constitucionales ni complejidad que requiera justificación.
