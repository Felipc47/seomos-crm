# Verificación — Calendar opcional (2026-10-26)

Estado al preparar la entrega: implementado y verificado localmente. Publicación
autorizada por el dueño el 2026-10-26; pendiente verificar el deploy.
Coolify consultado en lectura: Seomos CRM running:healthy, rama main.
El checkout contiene muchos cambios anteriores y no se publicó su árbol completo.

## Resultado

El agente ofrece reuniones sin Google y las guarda en la tabla existente
meeting, con origen manual, zona de la empresa y confirmación por chat. Conserva
confirmación del cliente, jornada, franjas, antelación, marcador de reunión,
etapa Cita agendada y recordatorio de 45 minutos. Sin conexión no promete Meet,
invitación por correo ni disponibilidad de calendarios externos. Las reservas
locales se pueden editar sin aportar un enlace. Google conectado conserva
invitaciones/Meet y control de conflictos; token revocado o permiso faltante
degrada al CRM y marca reconexión. Un fallo transitorio de creación de evento
conserva el camino de incidencia/handoff para no afirmar un resultado incierto.

## Evidencia

- BD exclusivamente local: seomos_calendar_optional_004 en localhost:5433;
  puerto CRM 3106; WA/IA/Google mocks. Sin mensajes ni credenciales reales.
- Playwright/Chrome: 32 checks con integración disponible (desconectada,
  conectada, conflicto, token revocado, reconexión, formulario manual,
  persistencia/edición, móvil y aislamiento entre empresas).
- Segundo arranque sin GOOGLE_CLIENT_ID/SECRET: 19 checks de oferta, negociación,
  confirmación, validación de horarios, persistencia/edición y recordatorio.
- Gate final: typecheck, lint, build de producción y 451 tests unitarios verdes
  (56 archivos). Se ejecutaron los binarios Node de los scripts de package.json;
  pnpm también pasó el primer gate, pero un segundo arranque quedó esperando.
- Capturas desktop, móvil y sección Agendamiento abiertas e inspeccionadas.
- git diff --check sin errores. Servidor de pruebas detenido al terminar.

Resultados y capturas en .artifacts/calendar-optional/: e2e.json,
sin-credenciales.json, agent-scheduling.png, sin-calendar.png,
sin-credenciales.png, mobile.png, build.log y unit.log.

Parche de aplicación para revisión: .artifacts/calendar-optional/fix.patch,
generado contra la copia de los archivos al iniciar esta sesión, aislando
cambios previos del usuario; 13 archivos. Aplicación comprobada con patch --dry-run
contra esa copia. Antes de publicar se debe aplicarlo sobre el main actual,
resolver cualquier deriva y repetir su gate en esa base. Los cambios de
pruebas y documentación permanecen también en el checkout.

Sin nuevas credenciales, dependencias o migraciones. Las reuniones locales no
se sincronizan retroactivamente al reconectar Google. Sin Google no se consulta
ocupación de calendarios externos; se proponen horarios de la jornada configurada.

## Preparación de producción

Se aplicó el parche sin conflictos sobre main 8583fd5 en un worktree aislado.
Gate de esa base: typecheck, lint, build y 451 tests unitarios aprobados.
El cambio no modifica credenciales, conexiones, configuración del agente ni
horarios de las empresas existentes. La imagen anterior 8583fd5 queda como
referencia de rollback en Coolify.
