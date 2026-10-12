import type { HelpGuide } from "@/lib/help-guides";

export type HelpUiContext = {
  conversation: "none" | "selected";
  ai?: "active" | "paused" | "unavailable" | "loading" | "blocked";
  window?: "open" | "closed";
};
export type HelpTourStep = {
  title: string;
  text: string;
  target?: string;
  completeWhen?: string;
  waiting?: string;
};
export type HelpTour = {
  id: string;
  title: string;
  href: string;
  steps: HelpTourStep[];
  completion: string;
  observed: boolean;
};
const target = (id: string) => `[data-help="${id}"]`;
const selectConversation: HelpTourStep = {
  title: "Abre el chat que quieres atender",
  text: "Elige esa conversación en la lista de Bandeja. Si no la ves, búscala por nombre o teléfono. El cambio se aplicará solo al chat que abras.",
  target: target("conversation-list"),
  completeWhen: '[data-help="inbox"][data-help-state="selected"]',
  waiting: "Abre una conversación para continuar",
};
const pauseConversation: HelpTourStep = {
  title: "Apaga este interruptor",
  text: "En la cabecera, a la derecha del nombre del contacto, pulsa el interruptor «IA en esta conversación». Pasa de IA activa a IA pausada. El agente sigue funcionando en los demás chats.",
  target: `${target("chat-ai")} [role="switch"]`,
  completeWhen: '[data-help="inbox"][data-help-ai="paused"] [data-help="chat-ai"]',
  waiting: "Esperando a que el chat muestre IA pausada",
};
const configurations: Record<string, { steps: HelpTourStep[]; completion?: string; observed?: boolean }> = {
  "contacts-export": { steps: [
    { title: "Pulsa Exportar CSV", text: "Este es el botón de descarga en la barra superior de Contactos. Descarga todos los contactos de tu empresa, incluidos los archivados; no aplica el buscador ni el filtro de etapa. La guía no lo pulsa por ti.", target: target("contacts-export") },
    { title: "Revisa contactos.csv", text: "Busca el archivo en Descargas o en la ubicación que elegiste. Lleva nombre, telefono, correo, notas, etapa y archivado. Ábrelo en tu hoja de cálculo y filtra allí la etapa/archivado si necesitas un subconjunto." },
  ], completion: "Ya sabes dónde descargar y cómo revisar el CSV. La descarga no modifica los contactos; comprueba el archivo en tu navegador o carpeta de Descargas." },
  "contacts-import": { steps: [
    { title: "Prepara la plantilla", text: "Descarga Plantilla y prepara nombre, telefono, correo y notas. Nombre/teléfono son obligatorios; teléfono con código de país. Guarda CSV (coma o punto y coma), máximo 500 contactos y aproximadamente 1 MB.", target: target("contacts-template") },
    { title: "Elige el CSV que quieres importar", text: "Pulsa Importar CSV y selecciona el archivo revisado. Al elegirlo se inicia la importación. Los teléfonos duplicados se omiten sin actualizar contactos existentes; importar no registra permiso de marketing.", target: target("contacts-import") },
    { title: "Revisa el resultado", text: "Comprueba creados, duplicados y líneas inválidas en el resultado. Corrige las filas indicadas y repite si hace falta. Los nuevos contactos entran a la primera etapa abierta; para cambiar datos existentes utiliza Editar." },
  ] },
  "contacts-create": { steps: [
    { title: "Abre Nuevo prospecto", text: "Pulsa Nuevo en la barra de Contactos. Prepararemos los datos de una persona; abrir el formulario no crea el registro.", target: target("contacts-new"), completeWhen: target("contact-create-fields"), waiting: "Pulsa Nuevo para continuar" },
    { title: "Completa los datos de la persona", text: "Escribe Nombre y WhatsApp con código de país. Correo y Notas son opcionales. Revisa que el teléfono sea correcto y que no sea un contacto que ya existe.", target: target("contact-create-fields") },
    { title: "Revisa y crea el prospecto", text: "Pulsa Crear prospecto cuando los datos estén correctos. Comprueba que aparezca en Contactos y el pipeline. No se registra consentimiento de marketing por darlo de alta manualmente.", target: target("contact-create-submit") },
  ] },
  "pause-agent": { steps: [selectConversation, pauseConversation], observed: true, completion: "La cabecera muestra IA pausada. El agente dejará de responder automáticamente en este chat. Los demás chats conservan su configuración." },
  handoff: { steps: [selectConversation, pauseConversation], observed: true, completion: "Este chat muestra IA pausada. Ya puedes atenderlo personalmente. Para devolverlo al agente, enciende el mismo interruptor cuando lo decidas." },
  "resume-agent": { steps: [selectConversation, {
    title: "Enciende la IA de este chat",
    text: "Pulsa el interruptor «IA en esta conversación» en la cabecera. Al reactivarlo, el agente puede retomar una respuesta pendiente si la ventana de WhatsApp está abierta. Hazlo cuando quieras devolverle la atención.",
    target: `${target("chat-ai")} [role="switch"]`, completeWhen: '[data-help="inbox"][data-help-ai="active"] [data-help="chat-ai"]', waiting: "Esperando a que el chat muestre IA activa",
  }], observed: true, completion: "La cabecera muestra IA activa. El agente puede atender esta conversación según su configuración y la ventana de WhatsApp." },
  inbox: { steps: [selectConversation, {
    title: "Revisa quién está atendiendo",
    text: "Aquí ves el estado de la IA. Si vas a atender personalmente, apaga el interruptor antes de escribir para evitar respuestas automáticas mientras atiendes.", target: target("chat-ai"),
  }, {
    title: "Prepara tu respuesta",
    text: "Escribe en «Escribe una respuesta…» abajo del historial. Revisa el texto y pulsa Enviar solo cuando quieras enviarlo. Si la ventana está cerrada, aquí aparecerá el selector de una plantilla aprobada.", target: target("composer"),
  }], completion: "Ya conoces dónde responder y cómo pausar la IA. Preparar el texto no lo envía: tú decides cuándo pulsar Enviar." },
  "whatsapp-window": { steps: [selectConversation, {
    title: "Revisa la ventana de atención", text: "Si no puedes escribir libremente y aparece «La ventana de 24 horas está cerrada», necesitas una plantilla aprobada. La ventana se abre con un nuevo mensaje del cliente.", target: target("composer"),
  }, { title: "Selecciona y revisa la plantilla", text: "En el selector inferior elige una plantilla aprobada, completa sus variables y revisa el resultado antes de enviarlo. Si no hay plantillas, pide al administrador que las sincronice o prepare una.", target: target("composer") }] },
  contacts: { steps: [
    { title: "Busca a la persona", text: "Escribe su nombre o teléfono en este buscador. Si no aparece, comprueba el filtro de etapa y «Ver archivados».", target: target("contacts-search") },
    { title: "Abre su ficha", text: "Localiza el resultado y usa Ver detalles para revisar la ficha, o Editar para cambiar sus datos. Comprueba que sea la persona correcta antes de guardar.", target: target("contacts-results") },
  ] },
  profile: { steps: [
    { title: "Cambia tu nombre", text: "Edita el campo Nombre. Tu correo aparece debajo como solo lectura. Puedes omitir este paso si solo quieres cambiar la foto.", target: target("profile-name") },
    { title: "Elige tu foto", text: "Pulsa Subir foto o Cambiar foto y selecciona una imagen JPG, PNG o WEBP. Este botón guarda la foto que elijas; Quitar elimina la foto actual.", target: target("profile-photo") },
    { title: "Guarda el nombre si lo cambiaste", text: "Pulsa Guardar cambios y comprueba «Perfil guardado». Si el botón está deshabilitado y no cambiaste el nombre, puedes terminar: no hay un cambio de nombre pendiente.", target: target("profile-save") },
  ] },
  agent: { steps: [
    { title: "Define cómo se presenta", text: "En Comportamiento, completa Nombre del agente y Saludo. Si prefieres preparar un borrador con ayuda, arriba tienes Configurar con IA; revisa esa propuesta antes de aplicarla.", target: target("agent-identity") },
    { title: "Ajusta sus reglas", text: "Debajo están Tono, Entrenamiento del agente y Escalado a humano. Indica qué debe hacer, sus límites y cuándo pasar la atención a una persona.", target: target("agent-training") },
    { title: "Revisa y guarda", text: "Pulsa Guardar comportamiento cuando hayas revisado los cambios. Este botón guarda la configuración; el interruptor general del agente decide si responde automáticamente.", target: target("agent-save") },
  ] },
  knowledge: { steps: [
    { title: "Escribe una pregunta real del negocio", text: "En Knowledge base → Nueva pregunta / respuesta, completa la pregunta frecuente y una respuesta confirmada. Por ejemplo: «¿Cuál es el horario?» y el horario real del negocio.", target: target("knowledge-qa") },
    { title: "Añádela a la base", text: "Revisa ambos campos y pulsa Agregar P/R. Comprueba que la entrada aparezca en la lista. Para políticas o información larga puedes usar Nuevo bloque de texto libre.", target: target("knowledge-add") },
  ] },
  "mailing-sequence": { steps: [
    { title: "Abre Automatizaciones", text: "Pulsa Automatizaciones en la barra de Mailing. Cada contacto tendrá su propio calendario desde que se inscribe.", target: target("mailing-sequences"), completeWhen: '[data-help="mailing"][data-help-state="sequences"]', waiting: "Abre Automatizaciones para continuar" },
    { title: "Prepara el programa", text: "Usa Nueva automatización si quieres otro borrador. Completa el nombre, elige la lista y configura cada paso: día desde inscripción, asunto y mensaje. Para 7, 14 y 21 días, añade tres pasos con esos días.", target: target("mailing-editor") },
    { title: "Guarda antes de activar", text: "Pulsa Guardar borrador y revisa los correos. Después, Revisar activación abre la confirmación. Activar automatización inicia el programa: hazlo solo cuando quieras que empiece. Los contactos existentes se inscriben con su botón específico.", target: target("mailing-save") },
  ] },
  mailing: { steps: [
    { title: "Abre Campañas", text: "Pulsa Campañas. Antes de enviar necesitas una lista con suscriptores que dieron permiso y un remitente verificado.", target: target("mailing-campaigns"), completeWhen: '[data-help="mailing"][data-help-state="campaigns"]', waiting: "Abre Campañas para continuar" },
    { title: "Prepara el correo", text: "Usa Nueva campaña, completa nombre, lista, asunto y contenido. Vista previa te muestra el resultado. Puedes guardar el borrador sin enviarlo.", target: target("mailing-editor") },
    { title: "Revisa antes de enviar", text: "Guarda el borrador. En Envío y programación decide Enviar ahora o Programar para después. Revisar envío abre una confirmación: el envío comienza únicamente al confirmar.", target: target("mailing-save") },
  ] },
};

// Objetivos de pantalla versionados. En tareas con registros múltiples se
// señala la región para que la persona elija su registro; no el primer botón
// de borrar/bloquear de una fila arbitraria.
const taskTargets: Record<string, string> = {
  "inbox-search": target("conversation-list"), "inbox-pin": target("conversation-list"), "inbox-archive": target("conversation-list"),
  "inbox-bulk": target("inbox-select"), "inbox-block": target("conversation-list"), "inbox-report": target("conversation-list"), "inbox-delete": target("conversation-list"),
  "inbox-transfer": target("chat-transfer"), "inbox-details": target("chat-details"), "manual-meeting": target("chat-details"),
  "inbox-attachments": target("composer"), "inbox-voice": target("composer"),
  "contacts-views": target("contacts-search"), "contacts-archive": target("contacts-results"), "contacts-consent": target("contacts-results"), "contacts-delete": target("contacts-results"),
  "pipeline-views": target("pipeline-search"), "pipeline-stages": target("pipeline-manage"), "pipeline-close": target("pipeline"), pipeline: target("pipeline"),
  dashboard: '[aria-label="Rango del Dashboard"]', "dashboard-range": '[aria-label="Rango del Dashboard"]', "dashboard-metrics": target("dashboard"),
  "agent-toggle": '[aria-label="Agente encendido"]', "agent-setup": target("agent-setup"), "agent-training": target("agent-training"), "agent-credits": '[aria-label="Saldo de créditos de IA"]',
  "knowledge-block": target("knowledge-block"), "knowledge-delete": target("knowledge-list"), "agent-followup": target("agent-followup"), "agent-scheduling": target("agent-scheduling"),
  templates: target("template-create"), "templates-variables": target("template-create"), "templates-edit": target("template-list"), "templates-approval": target("template-list"), "templates-delete": target("template-list"), "templates-sync": target("templates-sync"), "templates-greeting": target("templates-greeting"),
  campaigns: target("campaign-create"), "campaigns-audience": "#cmp-mode", "campaigns-control": target("campaign-list"), "campaigns-errors": target("campaign-list"),
  services: target("services"), "services-create": target("services-create"), "services-assignment": target("services"), "services-forms": target("services"), "services-greeting": target("services"), "services-delete": target("services"),
  "whatsapp-connection": target("whatsapp-settings"), calendar: target("calendar-settings"), "calendar-settings": target("calendar-settings"), "calendar-disconnect": target("calendar-settings"),
  team: target("team-create"), "team-roles": target("team-members"), "team-password": target("team-members"), forms: target("webforms-create"), "forms-manage": target("webforms-list"), branding: target("branding"), notifications: target("notification-settings"), "notifications-feed": target("notifications-feed"),
  "app-theme": '[aria-label="Modo oscuro"], [aria-label="Modo claro"]', "app-logout": '[aria-label="Cerrar sesión"]',
};
const audienceTasks = new Set(["mailing-lists", "mailing-subscribers", "mailing-import", "mailing-consent"]);
const programTasks = new Set(["mailing-content", "mailing-test", "mailing-control", "mailing-schedule", "mailing-enroll", "mailing-stop-enrollment", "mailing-status"]);

/** Solo IDs autorizados del catálogo; jamás selectores o instrucciones del modelo. */
export function getHelpTour(guide: HelpGuide): HelpTour {
  const configuration = configurations[guide.id];
  let steps: HelpTourStep[] = configuration?.steps ?? guide.steps.map((text, index) => ({ title: `Paso ${index + 1}`, text, ...(index === 0 && taskTargets[guide.id] ? { target: taskTargets[guide.id] } : {}) }));
  if (!configuration && ["inbox-transfer", "inbox-details", "manual-meeting", "inbox-attachments", "inbox-voice"].includes(guide.id)) steps = [selectConversation, ...steps];
  if (!configuration && audienceTasks.has(guide.id)) steps = [{ title: "Abre Audiencia", text: "Pulsa Audiencia para gestionar listas y suscriptores de email. Es independiente de Contactos de WhatsApp.", target: target("mailing-audience"), completeWhen: '[data-help="mailing"][data-help-state="audience"]', waiting: "Abre Audiencia para continuar" }, ...steps];
  if (!configuration && programTasks.has(guide.id)) steps = [{ title: "Abre el programa correcto", text: "Elige Campañas o Automatizaciones y abre el programa por su nombre. En móvil usa Abrir programa. Después sigue los pasos de esta tarea.", target: target("mailing") }, ...steps];
  if (!configuration && ["mailing-dns", "mailing-tracking"].includes(guide.id)) steps = [{ title: "Abre Remitente y DNS", text: "Pulsa Remitente y DNS. Los cambios de dirección, dominio y métricas corresponden al administrador de tu empresa.", target: target("mailing-sender"), completeWhen: '[data-help="mailing"][data-help-state="sender"]', waiting: "Abre Remitente y DNS para continuar" }, ...steps];
  return {
    id: guide.id, title: guide.title, href: guide.href,
    steps,
    completion: configuration?.completion ?? "Terminaste el recorrido. Revisa el resultado de tus cambios en la pantalla; guardar, activar o enviar depende de los botones que tú pulses.",
    observed: configuration?.observed ?? false,
  };
}

/** Solo estados enumerados. No lee texto, identificadores ni valores de formularios. */
export function readHelpContext(pathname: string): HelpUiContext | undefined {
  if (pathname !== "/inbox" || typeof document === "undefined") return undefined;
  const inbox = document.querySelector<HTMLElement>('[data-help="inbox"]');
  if (!inbox) return undefined;
  if (inbox.dataset.helpState !== "selected") return { conversation: "none" };
  const ai = inbox.dataset.helpAi;
  const window = inbox.dataset.helpWindow;
  return {
    conversation: "selected",
    ...(["active", "paused", "unavailable", "loading", "blocked"].includes(ai ?? "") ? { ai: ai as HelpUiContext["ai"] } : {}),
    ...(window === "open" || window === "closed" ? { window } : {}),
  };
}
