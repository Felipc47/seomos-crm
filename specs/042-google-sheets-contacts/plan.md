# Plan: Google Sheets → contactos
**Branch**: codex/google-sheets-contacts | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)
## Summary
Añadir adaptador CSV de Google con destinos HTTPS permitidos, límites y timeout; tablas aditivas, servicio transaccional tenant-scoped, API admin, interfaz junto a WebFormsClient y cron independiente cada minuto.
## Technical Context
TypeScript estricto / Next 15 / Drizzle PostgreSQL. Sin dependencias ni secretos nuevos. Google Sheets export CSV ya disponible en origen. Vitest + Playwright y PostgreSQL local dedicado. Hasta 10000 filas y 5 MB. Ciclos acotados, reserva persistente con token y vencimiento.
## Constitution Check
Ampliación acotada del principio II autorizada por la solicitud expresa del dueño: Google Sheets opcional exclusivamente lectura para sincronizar contactos. No modifica Calendar. Seguridad: sin credenciales ni PII en logs, URLs normalizadas y redirects restringidos. Tenant en las tablas y queries. Enumeración cron cruza empresas únicamente para localizar conexiones activas. Idempotencia por constraints y transacción. Specs antes de código, gates y self-test obligatorios.
## Project Structure
- src/lib/google/sheets.ts: acceso CSV y errores seguros.
- src/lib/sheets-contacts.ts: esquema, parseo, fusión conservadora.
- src/lib/db/schema.ts + drizzle: fuente y ledger.
- src/server/sheets/: guardar configuración e importar.
- src/app/api/settings/sheets/: CRUD limitado y ejecución.
- src/app/api/cron/sheets/: runner autenticado separado de cron existentes.
- src/components/settings/sheets-client.tsx + integración aditiva en página existente.
- tests/unit/sheets-contacts.test.ts y tests/e2e/sheets-contacts.mjs.
## Dependencies / rollout
Partir de origin/main d4a28e5 en worktree SSD aislado. Migración únicamente CREATE. Probar antes de publicar. Cron propio en Coolify con AGENT_SWEEP_SECRET existente. Configurar las pestañas 0 y 1952065539 solo en Lion Data. Verificar conteos y ejecuciones sucesivas; conservar evidencia sin PII. Rollback de código deja tablas inertes, sin revertir ni borrar contactos.
