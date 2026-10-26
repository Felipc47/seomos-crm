# Misión y ritmo opcional del bot (036)

Arrancar PostgreSQL local en 5433 y crear `seomos_mission_036`; aplicar migraciones con `DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seomos_mission_036 MIGRATIONS_DIR="$PWD/drizzle" node scripts/migrate.mjs`.

Ejecutar `node tests/e2e/agent-mission-start.mjs` y después `node tests/e2e/agent-mission.mjs`.

El guion usa Playwright con Chrome, credenciales ficticias y mocks locales. Cubre formulario guardado/recarga, demo sin guardar, mínimo exacto de respuestas, exclusiones del contador, historial largo, solicitud directa, desconexión de Calendar, misión ecommerce con enlace, errores de entrada/proveedor y aislamiento entre empresas. Evidencias en `.artifacts/agent-mission/`. Nunca ejecutar estos mocks en producción.
