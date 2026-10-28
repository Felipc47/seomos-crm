# Verificación — 2026-10-26

- Build de producción Next.js completo y correcto.
- Tipos, lint y 507 unitarios (59 archivos): verdes. Incluye contratos parciales,
  límite exacto, prioridad de prompt, acciones y texto prematuros, idioma, conteo
  tenant-scoped y falsas solicitudes por reservas de productos/campañas.
- Playwright + PostgreSQL aislado `seomos_mission_036` + WA/IA mocks: 33/33.
  Formulario guardado/recarga; mínimo 3 permite propuesta desde respuesta 4;
  cuenta historial >20 y aceptación Meta antes del webhook; excluye humanos,
  fallidos, plantillas y pendientes sin evidencia; petición directa registra en
  CRM sin Google; demo sin guardar; errores 422/503 y recuperación; ecommerce
  con enlace; móvil sin overflow; configuración y permisos entre empresas.
- Migración 0032 generada por Drizzle: backfill sobre perfil anterior con
  instrucciones intactas y defaults `legacy/false/3`; segunda ejecución correcta.
- Evidencia local: `.artifacts/agent-mission/{unit.log,e2e.log,e2e.json,
  migration.json,desktop.png,mobile.png,build.log}`. Datos/credenciales ficticios.
- Producción: pendiente del despliegue y smoke autenticado, registrado aparte.

No se configura ni activa la opción para una empresa sin que el administrador
la guarde. Ecommerce no conecta catálogo, stock, pagos ni pedidos.
