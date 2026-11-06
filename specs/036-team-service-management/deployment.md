# Publicación 036 — Equipo y servicios

Autorización directa del dueño: «pasa a produccion», 2026-11-06.

- Aplicación Coolify: Seomos CRM, `ds8dao6gcn8qg4ro04upkgno`.
- Dominio canónico: https://seomos.cloud.
- Producción previa / main: `eb1d9a6bfc2786ece06ac2777fd93a58cce3dc62`, deployment `j0wok3mhxuvcpbre2tnvii7w`, running:healthy y health HTTP 200 antes de publicar.
- Preparación en el SSD: `/Volumes/Codex-SEOMOS/Proyectos/seomos-crm-team036-release`, rama `codex/036-team-service-management`, basada en el commit productivo. No se copiaron los cambios ajenos del árbol original.
- Se incluyeron únicamente los módulos de Equipo/Servicios, el cierre del stream SSE al eliminar membresía, la ayuda correspondiente, pruebas y especificación.
- Gate de la release: typecheck, lint y build correctos; 578/578 pruebas unitarias. E2E de la versión exacta: 51/51 principal y 26/26 con admins normales de empresas ficticias; ambos verdes.
- No hay migraciones, nuevas variables ni cambios de credenciales/runtime. Ningún miembro real se elimina ni modifica como parte del despliegue.
- Rollback: restaurar el pin y desplegar el commit previo; conservar la base de datos. Las operaciones administrativas que el usuario ejecute después del despliegue son datos de negocio y no se revierten con el código.

Estado: preparación y comprobaciones de release; publicación aún no afirmada.
