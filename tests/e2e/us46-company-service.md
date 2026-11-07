# US46 — Servicio por empresa

BD dedicada `seomos_company_service_037`, Next local :3108 y mocks obligatorios. Aplicar migraciones y ejecutar `node tests/e2e/us46-company-service-start.mjs`, después `node tests/e2e/us46-company-service.mjs`.

Crear superadmin y dos empresas ficticias. Suspender desde Empresas, comprobar mensaje en sesiones abiertas/nuevas y restricciones API/SSE/auth plugin. Verificar que otra empresa funciona y que contactos/créditos permanecen intactos. Editar aviso, alternar motivos, probar validación y fallo de red, reactivar desde UI y recuperar la misma sesión. Probar que webhooks no ingresan mensajes mientras la empresa está suspendida y sí tras reactivarla. Conducir vista móvil y capturar evidencia. No tocar estado de empresas de producción.
