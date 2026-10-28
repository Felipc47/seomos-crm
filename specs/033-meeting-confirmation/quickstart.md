# Verificación y publicación — 033

## Estado
Implementación local con migración versionada, UI en Bandeja/Contactos,
agendamiento manual/IA y confirmación por WhatsApp. No se publicó esta feature
ni se modificó la base, los cron o las plantillas de producción.

## Prueba funcional — 2026-10-13
- PostgreSQL: base exclusivamente local `seomos_meeting_033`, migraciones aplicadas.
- CRM: copia en `/private/tmp/seomos-meeting033`, puerto 3104, WA/IA/Google mocks;
  ninguna credencial ni mensaje real.
- Playwright/Chrome: 147 comprobaciones aprobadas de UI/canal, incluyendo feliz e
  infeliz, móvil, tenant ajeno, empresa retirada, backfill y Google manual/IA.
- Cron exclusivo: prueba adicional de autorización, umbral, concurrencia con el
  barrido general, repetición idempotente y mensaje observable en el hilo.
- Capturas inspeccionadas: `evidence/desktop.png` y `evidence/mobile.png`.
- Gate final: typecheck y lint sin errores, build de producción correcto, 55 archivos/438 tests unit aprobados.
- El envío solicitado no marca asistencia confirmada. La respuesta queda en chat.

## Activación al publicar
1. Publicar el código de 033 y aplicar `drizzle/0031_great_elektra.sql` mediante
   el migrador de arranque. Preservar los cambios ajenos del checkout: no publicar
   indiscriminadamente el árbol de trabajo.
2. Configurar una tarea exclusiva cada minuto que haga POST a
   `/api/cron/meetings`, con `Authorization: Bearer` usando AGENT_SWEEP_SECRET
   existente en runtime. Sin nuevo secreto. Mantener el cron general, documentado
   cada cinco minutos, como recuperación. Su precisión nominal es de un barrido.
3. Agente → Agendamiento: seleccionar una plantilla **UTILITY aprobada**, sin
   encabezado ni mapeo y con una variable {{1}}. Ejemplo de cuerpo:
   `Hola, te recordamos nuestra reunión: {{1}}. ¿Nos confirmas si podrás asistir?`
   {{1}} contiene fecha, hora, zona y enlace en una sola línea. El admin guarda
   la selección; el CRM valida empresa, aprobación, categoría y formato.
4. Con ventana de 24h abierta se envía texto libre con datos de reunión. Cerrada,
   sin plantilla válida, se omite y se muestra el motivo. No se elude la regla.
5. Revisar reuniones anteriores recuperadas: fecha conservada, enlace aún en las
   notas heredadas cuando exista; el registro estructurado requiere revisar ese
   enlace y activar la confirmación. No dispara mensajes inesperados al migrar.
6. Verificar deploy/health y la UI autenticada. No usar mensajes a leads reales
   para una prueba sin autorización y destinatario de prueba acordado.

## Comportamientos operativos
- Una próxima reunión por contacto. Editar/retirar el registro cambia CRM y
  recordatorio; no reprograma ni cancela Google Calendar.
- Reprogramación rearma el recordatorio. Guardar igual o desactivar/reactivar un
  envío ya procesado no duplica. `sending` impide cambios hasta terminar.
- Un resultado incierto queda visible y no se reenvía automáticamente. Un claim
  interrumpido se marca incierto después de cinco minutos. Transporte del envío
  limitado a 20 segundos; barrido con presupuesto de 100 y límite de 40 segundos
  antes del siguiente destinatario.
- La cita registrada suspende el seguimiento comercial pendiente del lead.
- No hay nuevas credenciales, proveedores ni costo de LLM.

## Herramientas de verificación
Se usaron los binarios Node instalados, equivalentes a los scripts pnpm. El
launcher pnpm intentó cambiar a 11.5.0 y falló al consultar/verificar su paquete;
no se cambió package.json/lockfile ni se instaló otra versión. Se restauró la
resolución local de dos plugins ESLint ya instalados mediante enlaces en
node_modules (gitignored). La compilación final se realiza en una segunda copia
local sin compartir `.next` con el servidor de prueba.
