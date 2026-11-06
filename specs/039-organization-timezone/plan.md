# Plan

Usar calendar.timezone en organization.metadata como fuente única existente. Añadir esquema IANA compartido y endpoint autenticado con escritura atómica JSONB para preservar los demás ajustes. Contexto React inicializado en servidor para todos los formatos visibles; conversión de datetime-local del mailing en la zona elegida. Nueva pestaña independiente del calendario.

Trabajar en checkout aislado basado en producción 9dcbade para preservar cambios ajenos. No cambiar dependencias ni esquema. Probar unidades (validación, fecha local, DST), gate completo y Playwright con navegador en Tokio, proveedores mock y empresas ficticias; probar permisos, aislamiento, persistencia, red fallida, mensajes y reuniones. Publicar commit exacto, configurar las tres empresas y verificar UI/health.
