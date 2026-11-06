# Plan 036

Reutilizar Servicios y Equipo sin dependencias ni migraciones nuevas. Mantener los nombres históricos `executives`/`assignedExecutive` del contrato de servicios por compatibilidad, ampliando candidatos y agregando el rol.

Centralizar edición/eliminación en `src/server/team.ts`; bloquear la organización dentro de la transacción para serializar la protección del último administrador desde Equipo y Empresas. Revalidar permiso del actor dentro de la transacción. Usar `scoped()` para membresías y asignaciones; acceder a cuenta global solo tras resolver membresía local. Eliminar únicamente membresía, limpiar asignaciones y revocar sesiones de esa empresa; correo modificado invalida sesiones globales. Revalidar membresía SSE para cortar acceso eliminado.

Actualizar UI, ayuda, unitarias y E2E. Preservar cambios ajenos presentes en el árbol. Verificar local antes de considerar publicación.
