/** Intenciones inequívocas del producto, sin llamadas al proveedor. El acceso
 * se comprueba después contra el catálogo filtrado de la sesión. */
const all = (text: string, ...patterns: RegExp[]) => patterns.every((pattern) => pattern.test(text));
export function findHelpIntent(text: string, pathname: string): string | undefined {
  const mailing = /mailing|suscriptor|newsletter|boletin/.test(text) || ((/email|correo/.test(text) || pathname === "/mailing") && !/whatsapp|telefono|prospecto/.test(text));
  if (all(text, /\b(ia|bot|agente)\b/, /todos|global|empresa/, /encend|apag|activ|paus/)) return "agent-toggle";
  if (all(text, /\b(ia|bot|agente)\b/, /chat|conversacion|bandeja/) || (pathname === "/inbox" && /\b(ia|bot|agente)\b/.test(text))) {
    if (/desactiv|inactiv|apag|paus|deten|silenci/.test(text)) return "pause-agent";
    if (/reactiv|activ|encend|devolv/.test(text)) return "resume-agent";
  }
  if (mailing && all(text, /import|pegar|cargar|subir/, /csv|archivo|contact|suscriptor|correo|email|lista|base/)) return "mailing-import";
  if (all(text, /import|cargar|subir/, /contact|prospect|lead|csv|base|excel/)) return "contacts-import";
  if (all(text, /export|descarg|bajar|\bexcel\b/, /contact|prospect|lead|csv/) && !/suscriptor|mailing/.test(text)) return "contacts-export";
  if (pathname === "/contacts" && /export|descarg.*csv|bajar.*csv/.test(text)) return "contacts-export";
  if (all(text, /contrasena|password/, /equipo|companero|miembro|otro usuario/)) return "team-password";
  if (all(text, /equipo|usuario|miembro/, /rol|permis/)) return "team-roles";
  if (all(text, /empresa/, /restaur|elimin|borr|suspend/)) return "companies-delete";
  if (all(text, /credito/, /recarg|agregar|anadir/) && /empresa|superadmin/.test(text)) return "companies-credits";
  if (all(text, /credito|saldo|balance/, /ia|agente|bot/)) return "agent-credits";
  if (all(text, /empresa/, /crear|nueva|agregar/)) return "companies-create";
  if (all(text, /empresa/, /equipo|miembro|rol/)) return "companies-team";
  if (all(text, /formulario|integracion/, /rotar|secreto|desactivar|activar|cambiar.*servicio/)) return "forms-manage";
  if (all(text, /calendario|calendar|google/, /desconect|reconect|cambiar.*cuenta/)) return "calendar-disconnect";
  if (all(text, /reunion|calendar|calendario/, /invitad|titulo.*defecto|duracion.*defecto/)) return "calendar-settings";
  if (all(text, /agenda|reunion|jornada/, /horario|antelacion|franja|inicio|fin/)) return "agent-scheduling";
  if (all(text, /agendar|programar/, /reunion|cita/) && !/automat|agente|mailing/.test(text)) return "manual-meeting";
  if (all(text, /seguimiento/, /automatic|configur|plantilla|intento/)) return "agent-followup";
  if (all(text, /agente/, /configurar.*ia|asistente|borrador|sitio web/)) return "agent-setup";
  if (all(text, /agente|bot|ia/, /tono|entrenamiento|reglas|escalado/)) return "agent-training";
  if (all(text, /conocimiento|knowledge|faq|respuesta.*agente/, /eliminar|borrar|sustituir|actualizar/)) return "knowledge-delete";
  if (all(text, /conocimiento|knowledge|agente/, /horario|politica|direccion|bloque|texto libre/)) return "knowledge-block";
  if (all(text, /servicio/, /responsable|asignar|ejecutivo|comercial/)) return "services-assignment";
  if (all(text, /servicio|meta/, /vincular|desvincular|detectado/, /formulario/)) return "services-forms";
  if (all(text, /servicio/, /saludo|plantilla/)) return "services-greeting";
  if (all(text, /servicio/, /eliminar|borrar/)) return "services-delete";
  if (all(text, /servicio/, /nuevo|crear|agregar|anadir/)) return "services-create";
  if (mailing) {
    if (all(text, /inscrib|inscrip|inscrit/, /deten|sacar|parar|persona/)) return "mailing-stop-enrollment";
    if (/inscrib|inscrip|inscrit/.test(text)) return "mailing-enroll";
    if (all(text, /lista/, /crear|nueva|agregar/)) return "mailing-lists";
    if (/dar de baja|retirar permiso|registrar permiso|quitar.*lista|consentimiento/.test(text)) return "mailing-consent";
    if (all(text, /agregar|anadir/, /correo|email|suscriptor/)) return "mailing-subscribers";
    if (/responder a|reply|tracking/.test(text) || all(text, /apertura|\bclic/, /activar|configurar|medir/)) return "mailing-tracking";
    if (/apertura|\bclic/.test(text)) return "mailing-status";
    if (/personaliz|vista previa|contenido|asunto/.test(text)) return "mailing-content";
    if (/enviar.*prueba|probar.*correo|correo.*prueba/.test(text)) return "mailing-test";
    if (/programar|enviar ahora|fecha.*envio|envio.*fecha/.test(text)) return "mailing-schedule";
    if (/pausar|reanudar|cancelar|duplicar/.test(text)) return "mailing-control";
    if (/entreg|pendiente|fallid|rebote|historial|metricas|progreso/.test(text)) return "mailing-status";
  }
  if (all(text, /plantilla/, /variable|personaliz|texto fijo|fallback/)) return "templates-variables";
  if (all(text, /plantilla/, /sincron|pendiente|rechaz|estado/)) return "templates-sync";
  if (all(text, /plantilla/, /aprobar|devolver/, /admin|comercial|equipo|marketing/)) return "templates-approval";
  if (all(text, /plantilla/, /editar|cambiar.*texto|cambiar.*nombre|idioma|reemplaz/) && !/crear|nueva/.test(text)) return "templates-edit";
  if (all(text, /plantilla/, /eliminar|borrar/)) return "templates-delete";
  if (all(text, /saludo|primer mensaje/, /meta|leads|ads/)) return "templates-greeting";
  if (all(text, /campana|envio masivo/, /audiencia|destinatario|filtrar|segmentar/) && !mailing) return "campaigns-audience";
  if (all(text, /campana|whatsapp/, /fallido|error|excluido|menos destinatario/)) return "campaigns-errors";
  if (all(text, /campana|envio masivo/, /pausar|reanudar|reintentar|detalle/) && !mailing) return "campaigns-control";
  if (all(text, /voz|audio|microfono/, /grabar|nota|detener|cancelar/)) return "inbox-voice";
  if (all(text, /archivo|imagen|documento|pdf|foto|adjunto|video/, /enviar|adjunt|quitar/) && !/plantilla/.test(text)) return "inbox-attachments";
  if (all(text, /chat|conversacion|bandeja/, /transfer|responsable|asignar/)) return "inbox-transfer";
  if (all(text, /chat|conversacion|bandeja/, /seleccion|varios|multiple|lote/)) return "inbox-bulk";
  if (all(text, /chat|conversacion/, /bloque|desbloque/)) return "inbox-block";
  if (all(text, /chat|conversacion/, /report|reporte/)) return "inbox-report";
  if (all(text, /chat|historial|conversacion/, /eliminar|borrar|reiniciar/)) return "inbox-delete";
  if (all(text, /chat|conversacion/, /desarchiv|archiv/)) return "inbox-archive";
  if (all(text, /chat|conversacion/, /anclar|desanclar|fijar|\bpin\b/)) return "inbox-pin";
  if (all(text, /chat|bandeja|conversacion/, /buscar|encontrar|filtrar|no leidas/)) return "inbox-search";
  if (all(text, /mensaje|check|tick|palomita/, /estado|entregado|leido|enviado|no entregado/)) return "inbox-message-status";
  if (/demostracion|cargar.*demo|datos.*demo/.test(text)) return "inbox-demo";
  if (all(text, /chat|cliente|contacto/, /notas|detalle|ficha|datos|presupuesto|plazo/)) return "inbox-details";
  if (all(text, /contacto|prospecto|lead/, /crear|nuevo|agregar|anadir/)) return "contacts-create";
  if (all(text, /contacto/, /archiv|recuperar/)) return "contacts-archive";
  if (all(text, /contacto|whatsapp/, /consentimiento|permiso|dar de baja|retirar.*baja/)) return "contacts-consent";
  if (all(text, /contacto|prospecto/, /eliminar|borrar/)) return "contacts-delete";
  if (all(text, /contacto/, /filtrar|cuadricula|lista|ver archivados/)) return "contacts-views";
  if (all(text, /etapa|pipeline/, /gestionar|crear|nueva|renombrar|ordenar|eliminar.*etapa/)) return "pipeline-stages";
  if (all(text, /pipeline|prospecto/, /tablero|lista|vista|buscar/)) return "pipeline-views";
  if (all(text, /prospecto|lead|cliente|etapa/, /cerrar|ganado|perdido|no convertido|motivo/)) return "pipeline-close";
  if (all(text, /dashboard|resultado/, /fecha|periodo|rango|desde|hasta|7 dias|30 dias|90 dias/)) return "dashboard-range";
  if (all(text, /dashboard|conversion|sin asignar/, /significa|metrica|entender|resultado|equipo/)) return "dashboard-metrics";
  if (/notificaciones|campana de avisos/.test(text) && !/correo|email|configurar/.test(text)) return "notifications-feed";
  if (/modo oscuro|modo claro|cambiar.*tema/.test(text)) return "app-theme";
  if (/cerrar sesion|salir.*cuenta/.test(text)) return "app-logout";
  return undefined;
}
