# Plan 037

1. Añadir estado separado en organization: suspended_at, suspension_reason y suspension_message. Generar migración versionada aditiva sin modificar migraciones previas.
2. Centralizar lectura y guarda del servicio por organizationId con scoped(). Consultar BD en cada acceso, sin depender del estado de la cookie. Mantener membresías para permitir mostrar el aviso y recuperar la sesión al reactivar.
3. Endpoint superadmin PATCH /api/admin/companies/:id/service, validado con Zod, protección de empresa propia y eliminada, escritura atómica. GET privado /api/service-status solo expone el estado de la empresa de la sesión.
4. Botones y diálogo en Empresas, aviso fuera del layout privado y monitor de pestañas abiertas. Cortar SSE y bloquear las APIs privadas. Integrar guarda en acceso de credenciales y procesos automáticos.
5. Gate técnico y pruebas E2E con BD local dedicada y mocks; sin tocar empresas de producción. Preservar los numerosos cambios preexistentes del workspace.

Constitución: sin dependencias nuevas; secretos y guard is_test preservados; consultas por tenant; migración aditiva; llamadas repetidas idempotentes; verificación local antes de publicación. Esta entrega no implica merge/deploy de los cambios ajenos del árbol.
