# 036 — Responsables de servicios y gestión de equipo

Fecha: 2026-11-06. Aclaración del dueño: aplica a los admins de cada cuenta, incluyendo Baterías Conecta y Lion Data, sin requerir superadmin. Extiende 013 y la gestión de equipo existente.

- Un administrador puede asignar un servicio a cualquier miembro de su empresa: Admin, Editor de agente, Ejecutivo comercial o Marketing; incluye los roles históricos `admin` y `member`.
- El selector indica nombre y rol. La asignación automática usa esa misma elegibilidad. Cambiar un rol no elimina asignaciones.
- Desde Ajustes → Equipo, el administrador puede editar nombre, correo y rol en la fila del miembro, guardar o cancelar y ver errores sin perder la edición.
- El administrador puede eliminar un miembro mediante confirmación. Se elimina su membresía local y se liberan sus servicios/prospectos; se conservan cuenta, contactos, conversaciones e historial. El usuario pierde acceso a esa empresa.
- No se permite eliminarse a sí mismo, eliminar/degradar al último administrador ni eliminar/degradar al superadmin. Un admin no puede modificar la cuenta del superadmin.
- La identidad es global: para miembros de varias empresas, solo puede cambiarse el rol local; editar nombre/correo devuelve un error explícito para evitar efectos en otra empresa.
- Cambiar un correo exige volver a iniciar sesión y conserva la contraseña. Correos duplicados/invalidos no producen cambios parciales.
- API y pantalla exigen admin, validan tenant y soportan fallos de red. La protección del último administrador resiste operaciones concurrentes.

Verificación: gate completo; Playwright local con PostgreSQL aislado y mocks Meta/IA, roles, persistencia, edición/cancelación, eliminación, errores, aislamiento y móvil.
