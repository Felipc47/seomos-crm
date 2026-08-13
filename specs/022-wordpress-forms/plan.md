# Implementation Plan: Integración de formularios WordPress

**Branch**: `022-wordpress-forms` | **Date**: 2026-08-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/022-wordpress-forms/spec.md`

## Summary

Añadir una entrada pública y autenticada para formularios WordPress que normalice un contrato canónico, deduplique antes de ejecutar efectos y reutilice contacto, conversación, pipeline, servicios, notificaciones, WhatsApp y SSE existentes. Cada empresa administrará varias integraciones con secreto cifrado y una pantalla que entrega instrucciones copiables sin introducir servicios externos ni lógica arbitraria.

## Technical Context

**Language/Version**: TypeScript 5.7 estricto, React 19, Next.js 15 App Router

**Primary Dependencies**: Drizzle ORM, Zod, Better Auth, Tailwind CSS, SSE y cifrado AES-256-GCM existentes; `node:crypto` para secretos y comparación segura

**Storage**: PostgreSQL mediante Drizzle; dos tablas de dominio nuevas con migración versionada

**Testing**: Vitest para normalización/autenticación/rate limit; Playwright API + navegador y mocks internos para E2E; gate completo del repositorio

**Target Platform**: Contenedor Linux self-hosted y navegadores modernos; WordPress actúa únicamente como cliente HTTP

**Project Type**: Monolito web multi-tenant

**Performance Goals**: persistencia y respuesta pública p95 menor a 3 segundos con carga normal; trabajo externo secundario ejecutado después de asegurar el lead; cuerpo máximo 32 KiB

**Constraints**: sin dependencias de runtime nuevas; secreto cifrado y revelado una vez; auth pública constante y genérica; idempotencia concurrente; organización obligatoria; no almacenar payload crudo; fallos externos no revierten el lead

**Scale/Scope**: decenas de integraciones por empresa, cientos de envíos por minuto por instancia y miles de eventos históricos sin consultas N+1

## Constitution Check

### Pre-design

- **I Seguridad**: PASS. Secretos aleatorios cifrados, comparación constante, respuestas de autenticación indistinguibles, cuerpos acotados y allowlist de campos.
- **II Soberanía**: PASS. WordPress consume un endpoint del CRM; no se añade proveedor ni servicio administrado.
- **III Multi-tenancy**: PASS. Configuración y eventos llevan `organization_id`; FKs y consultas se validan dentro de la misma empresa.
- **IV Idempotencia**: PASS. La clave única `(organization_id, integration_id, external_id)` se inserta antes de todo efecto; los trabajos secundarios tienen marcadores/llaves propias.
- **V Calidad**: PASS. Incluye unitarias, contratos, E2E real y gate completo.
- **VI Specs antes de código**: PASS. Spec, plan, modelos, contratos y tareas preceden a implementación.
- **VII Trazabilidad**: PASS. La sincronización entrante, el consentimiento y los límites se documentan explícitamente.
- **VIII Foco vertical**: PASS. Convierte formularios web en prospectos atendibles por WhatsApp dentro del pipeline.
- **IX Verificación en vivo**: PASS. El quickstart conduce creación, webhook, vistas, rotación, aislamiento, duplicados y fallos de proveedores.

### Post-design

PASS. El contrato no permite escoger acciones, etapas o responsables desde el exterior; las dos entidades nuevas conservan aislamiento e idempotencia; la respuesta no espera proveedores lentos y los guardarraíles de WhatsApp siguen vigentes.

## Project Structure

```text
specs/022-wordpress-forms/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/http.md
└── tasks.md

src/
├── app/api/integrations/forms/[integrationId]/submissions/route.ts
├── app/api/settings/web-forms/route.ts
├── app/api/settings/web-forms/[id]/route.ts
├── app/api/settings/web-forms/[id]/rotate/route.ts
├── app/(app)/settings/integrations/page.tsx
├── components/settings/web-forms-client.tsx
├── lib/db/schema.ts
├── lib/db/ids.ts
├── lib/permissions.ts
├── lib/types.ts
├── server/web-forms/contract.ts
├── server/web-forms/credentials.ts
├── server/web-forms/ingest.ts
└── server/web-forms/rate-limit.ts

drizzle/
└── 0024_*.sql

tests/
├── unit/web-form-{contract,ingest}.test.ts
└── e2e/us32-wordpress-forms.{md,sh}
```

**Structure Decision**: Extender las fronteras existentes del monolito. La API pública vive bajo `integrations`, la administración bajo `settings`, el dominio reusable bajo `server/web-forms` y toda persistencia permanece en el esquema Drizzle compartido.

## Design

1. `web_form_integration` guarda una integración por sitio/formulario, servicio opcional, secreto AES-GCM, sufijo visible, habilitación y diagnóstico sanitizado.
2. `web_form_submission` es el ledger idempotente. Su índice único incluye empresa, integración e identificador externo y conserva solo relaciones/estado, nunca el body.
3. El endpoint obtiene integración y empresa activa en una consulta, valida `Authorization: Bearer`, tamaño/content-type y contrato Zod antes de reservar el identificador externo.
4. La comparación usa `timingSafeEqual` sobre hashes de longitud fija. Un fallo de integración, empresa, estado o secreto devuelve el mismo `401 unauthorized` y no registra el secreto.
5. El parser acepta JSON o `application/x-www-form-urlencoded`, normaliza aliases documentados y descarta propiedades desconocidas antes del dominio.
6. La ingesta normaliza el teléfono, crea/reactiva contacto con `consent_source=web_form`, conserva datos humanos, agrega una nota sanitizada y asegura conversación/lead mediante helpers existentes.
7. El servicio solo proviene de la integración. Se aplica si el lead aún no tiene servicio; la asignación histórica existente no se pisa.
8. Consentimiento `true` completa `consent_granted_at` sin alterar baja/bloqueo. El saludo se marca como intentado antes de llamar a WhatsApp y solo se agenda para un contacto realmente nuevo elegible.
9. Email, saludo y publicación secundaria se ejecutan tras persistir el resultado mediante el mecanismo de trabajo posterior de Next; cada fallo se captura y sanitiza. El endpoint devuelve el resultado durable sin esperar al proveedor.
10. Los endpoints internos usan `withAuth`, `canManageOrgSettings` y `scoped()`. Crear/rotar devuelve el secreto una vez; GET expone únicamente `secretLast4`.
11. La UI de Ajustes permite crear, editar servicio/estado, rotar y copiar URL, secreto inicial, `curl` y recetas de WordPress. Acciones destructivas requieren confirmación local.
12. Un limitador en memoria por integración e IP protege ráfagas inválidas en la topología de un contenedor del proyecto; responde `429` sin persistir body ni secreto.

## Complexity Tracking

No hay violaciones constitucionales. Dos tablas separan credencial mutable y ledger inmutable; combinarlas impediría rotación segura o idempotencia auditable.

## Verification Results

- Gate técnico final: `typecheck`, `lint`, `build` y 276 pruebas unitarias en 43 archivos, todo verde.
- E2E US32: 42 verificaciones de JSON/form-urlencoded, aliases WordPress, ledger concurrente, Contactos/Bandeja/Pipeline, servicio, consentimiento, saludo, fallos secundarios, secreto/rotación, roles y aislamiento.
- Regresión cumplimiento Meta US12: 25/25, incluidos origen, consentimiento, baja, límites y campañas.
- Regresión servicios/asignación US26: 51/51, incluidos Lead Ads, derivación, aislamiento, fallos, roles y responsive.
- Regresión correo US30: 35/35, incluidos avisos, resúmenes, idempotencia, aislamiento y fallo de Resend.
- Navegador real: creación desde Ajustes, revelado único tras recarga, pestaña activa, cero logs de consola y cero overflow a 375, 768 y 1440 px.
- El QA visual corrigió dos problemas antes del cierre: pestaña activa fuera de vista en móvil y doble barra lateral que estrechaba Ajustes en tablet.
