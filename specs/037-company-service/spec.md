# 037 — Suspensión reversible del servicio por empresa

Solicitud: el superadmin (ceo@seomos.com en producción) activa/desactiva el servicio desde Empresas y elige un aviso amable.

- Solo el rol superadmin puede cambiar el servicio; no se codifican privilegios por correo.
- Empresas muestra Servicio activo / Servicio suspendido y un botón Suspender / Reactivar. Suspender abre un diálogo con mantenimiento, pago pendiente o aviso personalizado (máximo 500 caracteres), con vista previa. El aviso puede editarse durante la suspensión. Reactivar es inmediato.
- Mantenimiento: «Estamos realizando algunas mejoras. Estaremos disponibles de nuevo en breve. Gracias por tu paciencia.»
- Pago pendiente: «Tu servicio está en pausa por un pago pendiente. Para reactivarlo, ponte al día o comunícate con nuestro equipo. Estamos para ayudarte.»
- Suspender conserva usuarios, datos, configuración y créditos sin plazo de borrado. Es independiente de eliminar/restaurar y del permiso de Mailing.
- Los usuarios autenticados de una empresa suspendida ven una pantalla de aviso, sin datos del CRM. Las sesiones abiertas detectan cambios en un máximo de 15 segundos y al volver a la pestaña. APIs privadas rechazan con 403/service_suspended. Tras reactivar, el usuario recupera acceso con su misma sesión.
- No se procesan nuevos mensajes de WhatsApp ni envíos WhatsApp/IA, campañas, formularios o tareas de mailing/reuniones/resúmenes para empresas suspendidas. Los servicios SMS y ecommerce también rechazan operaciones de una empresa suspendida. Se conservan los callbacks públicos de bajas y estados para no perder consentimiento ni resultados de entregas previas. Una petición externa ya enviada no puede retirarse. Campañas WhatsApp en curso se pausan y requieren reanudación explícita para evitar una ráfaga al reactivar.
- El superadmin no puede suspender su propia organización ni una empresa eliminada. Conserva acceso administrativo para reactivar otras empresas.
- Sin servicios, credenciales o variables de entorno nuevos.

## Aceptación

E2E con dos empresas: suspender desde UI, ver aviso en sesión existente y nueva, bloqueo API/canal, aislamiento de otra empresa, personalización, reactivación sin pérdida, protección de permisos/empresa propia/empresa eliminada, errores de validación y red sin UI atascada, vista móvil.
