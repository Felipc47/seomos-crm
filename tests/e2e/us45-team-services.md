# US45 — Responsables de servicios y administración del equipo por empresa

Escenario local aislado: `seomos_team_036` en PostgreSQL :5433, Next :3107. No usa datos ni APIs de producción. Requiere Chrome del sistema y la base vacía con las migraciones del repositorio aplicadas.

1. Crear únicamente esa base de prueba y aplicar migraciones con `DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seomos_team_036`.
2. Arrancar `node tests/e2e/us45-team-services-start.mjs` (mocks Meta/IA, email y Google deshabilitados).
3. Ejecutar `node tests/e2e/us45-team-services.mjs`: alta real, selección de todos los roles, persistencia, edición/cancelación, correo duplicado/inválido, cambio de correo y sesión, protección de admins, carrera entre admins, aislamiento, distribución por handoff con mocks, borrado confirmado, error de red/reintento, historial conservado, cierre SSE y móvil.
4. Reiniciar solo el servidor de prueba para renovar los límites en memoria de altas/login y mantener la BD. Ejecutar `node tests/e2e/us45-tenant-admins.mjs`. Crea dos empresas ficticias llamadas Baterías Conecta QA y Lion Data QA y conduce la interfaz con sus propios administradores normales (sin superadmin). En ambas: crear equipo de cuatro roles, asignar servicio a cada rol, editar/eliminar miembros, recargar y comprobar aislamiento bidireccional.
5. Detener el servidor antes de build para no compartir `.next` con Next dev.

Resultado observado: 51 + 26 comprobaciones verdes; capturas y logs en `.artifacts/us45-team-services/`. No ejecutar el antiguo shell US26 sobre otras bases: sus supuestos de roles y su reset pertenecen al escenario histórico.
