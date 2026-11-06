# Publicación 039 — zona horaria

Autorización directa del dueño: implementar, probar y pasar a producción sin otra autorización (2026-11-06).

Aplicación: Seomos CRM, `ds8dao6gcn8qg4ro04upkgno`, https://seomos.cloud.
Rollback de código: `9dcbadeee4434e47275dff8b21876714bd87acc4`.
No hay migraciones, nuevas credenciales ni cambios de dependencias/runtime.

Después del rollout, ejecutar explícitamente `scripts/set-organization-timezone.mjs` únicamente para:

- Marca SEOMOS: America/Bogota.
- Lion Data: America/New_York.
- Cuenta de baterías existente: Baterias Mac Center; Bogotá es el valor predeterminado. Se pidió aclaración opcional sobre el nombre Baterías Conecta.

SMANOVA no se modifica. La operación escribe solo calendar.timezone, es transaccional y reejecutable. Los cambios posteriores elegidos por cada cliente nunca son reseteados al arrancar/deplegar.

Estado: pruebas locales aprobadas; gate final completo (typecheck/lint/build, 582 unidades, 42 E2E); publicación pendiente.
