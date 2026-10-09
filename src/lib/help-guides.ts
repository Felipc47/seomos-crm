import { normalizeRole, type Role } from "@/lib/permissions";

export type HelpAccess = { role: string; isSuperadmin: boolean; mailingEnabled: boolean };
export type HelpGuide = {
  id: string;
  title: string;
  href: string;
  question: string;
  summary: string;
  keywords: string;
  steps: string[];
  access: "all" | "operations" | "admin" | "agent" | "superadmin" | "mailing" | "mailing_admin";
};
export type HelpGuideLink = Pick<HelpGuide, "id" | "title" | "href" | "steps">;

/** Mantener junto a los cambios de pantallas. Solo documentación, sin datos de clientes. */
export const HELP_GUIDES: HelpGuide[] = [
  {
    id: "inbox", title: "Responder desde la Bandeja", href: "/inbox", access: "all",
    question: "¿Cómo respondo a un cliente?", keywords: "bandeja responder mensaje chat conversacion cliente escribir enviar audio imagen adjunto",
    summary: "La Bandeja reúne las conversaciones de WhatsApp. Abre una conversación para revisar el historial y responder.",
    steps: ["Entra en Bandeja y selecciona una conversación.", "Revisa el historial y el estado del agente antes de responder.", "Escribe tu mensaje en el campo inferior. También puedes adjuntar archivos o grabar una nota de voz.", "Pulsa el botón de envío. Si la ventana de WhatsApp está cerrada, usa una plantilla aprobada."],
  },
  {
    id: "whatsapp-window", title: "Cuando WhatsApp no permite responder", href: "/inbox", access: "all",
    question: "¿Por qué no puedo enviar un mensaje?", keywords: "ventana 24 horas vencida cerrada error enviar envio whatsapp responder bloqueado plantilla",
    summary: "Los mensajes libres requieren una ventana de atención abierta: 24 horas desde el último mensaje del cliente. Fuera de ella necesitas una plantilla aprobada.",
    steps: ["Abre la conversación y revisa si la ventana está cerrada.", "Selecciona una plantilla aprobada disponible en el compositor y completa sus variables.", "Revisa el mensaje antes de enviarlo. Una respuesta del cliente vuelve a abrir la ventana.", "Si no hay plantillas disponibles o falla la conexión, pide al administrador que revise las plantillas y la conexión de WhatsApp."],
  },
  {
    id: "handoff", title: "Atender una conversación personalmente", href: "/inbox", access: "all",
    question: "¿Cómo tomo el control de una conversación?", keywords: "humano tomar control pausar agente conversacion atencion manual bot ia silencio",
    summary: "La conversación permite alternar la atención del agente y la atención humana. Revisa ese estado para evitar respuestas automáticas mientras atiendes.",
    steps: ["Abre la conversación que vas a atender en Bandeja.", "Revisa el control del agente en la conversación y pausa la atención automática si vas a responder personalmente.", "Responde desde el compositor y revisa el historial.", "Cuando termines, decide si reactivas el agente para esa conversación."],
  },
  {
    id: "contacts", title: "Encontrar y editar un contacto", href: "/contacts", access: "operations",
    question: "¿Cómo encuentro y edito un contacto?", keywords: "contacto contactos buscar nombre telefono editar datos ficha archivado",
    summary: "Las personas que escriben a WhatsApp se registran como contactos. Puedes buscar por nombre o teléfono y revisar su ficha.",
    steps: ["Entra en Contactos y busca por nombre o teléfono.", "Si no aparece, revisa el filtro de etapa y Ver archivados.", "Abre la ficha del contacto y revisa sus datos y conversación.", "Edita los campos disponibles y guarda los cambios."],
  },
  {
    id: "pipeline", title: "Mover un prospecto de etapa", href: "/pipeline", access: "operations",
    question: "¿Cómo cambio la etapa de un prospecto?", keywords: "etapa prospecto lead pipeline tablero kanban lista arrastrar seguimiento venta ganado perdido",
    summary: "Etapas del prospecto muestra el avance comercial en un tablero o una lista.",
    steps: ["Entra en Etapas del prospecto y localiza el prospecto.", "Usa Tablero o Lista según te resulte más cómodo.", "En el tablero, arrastra la tarjeta a una etapa manual, o abre la ficha y cambia su etapa.", "Revisa que el prospecto aparezca en la etapa correcta. Cita agendada se actualiza al confirmar una reunión; no se mueve manualmente."],
  },
  {
    id: "dashboard", title: "Consultar el Dashboard", href: "/dashboard", access: "operations",
    question: "¿Dónde veo los resultados del equipo?", keywords: "dashboard resultado equipo analitica estadistica ventas rendimiento metricas resumen",
    summary: "Dashboard muestra el resumen comercial y la distribución del trabajo de tu empresa.",
    steps: ["Entra en Dashboard.", "Selecciona el periodo disponible que quieras revisar.", "Revisa los indicadores y la distribución por etapa y equipo. Los resultados corresponden a tu empresa."],
  },
  {
    id: "agent", title: "Configurar el agente de IA", href: "/agent", access: "agent",
    question: "¿Cómo configuro el agente de IA?", keywords: "agente ia configurar comportamiento entrenamiento bot saludo tono reglas instrucciones activar",
    summary: "Agente permite definir el comportamiento del asesor que responde por WhatsApp. Configurar con IA prepara una propuesta que puedes revisar antes de guardar.",
    steps: ["Entra en Agente y abre Configurar con IA si quieres preparar una propuesta guiada.", "Describe el negocio, objetivo y límites; revisa los campos propuestos antes de aplicarlos.", "Ajusta nombre, saludo, tonos, Entrenamiento del agente y Escalado a humano.", "Pulsa Guardar comportamiento. Revisa el interruptor del agente para decidir si debe responder automáticamente."],
  },
  {
    id: "knowledge", title: "Enseñar respuestas al agente", href: "/agent", access: "agent",
    question: "¿Cómo enseño preguntas y respuestas al agente?", keywords: "knowledge conocimiento base pregunta respuesta faq informacion negocio horarios precios ensenar aprender",
    summary: "Knowledge base reúne preguntas y respuestas y bloques de texto que el agente usa como información del negocio.",
    steps: ["Entra en Agente y busca Knowledge base.", "En Nueva pregunta / respuesta escribe la pregunta frecuente y su respuesta confirmada.", "Para horarios, políticas u otra información amplia, utiliza Nuevo bloque de texto libre.", "Agrega la entrada y revisa que aparezca en la lista. Actualiza la información cuando cambie el negocio."],
  },
  {
    id: "templates", title: "Preparar una plantilla de WhatsApp", href: "/templates", access: "operations",
    question: "¿Cómo creo una plantilla de WhatsApp?", keywords: "plantilla template whatsapp aprobacion meta categoria variable idioma crear",
    summary: "Las plantillas de WhatsApp permiten iniciar o retomar conversaciones fuera de la ventana de 24 horas. Deben pasar la aprobación correspondiente antes de enviarse.",
    steps: ["Entra en Plantillas y prepara el contenido, idioma, categoría y variables.", "Guarda el borrador y revisa el contenido.", "Si eres comercial o marketing, solicita la aprobación del administrador. El admin gestiona el envío a Meta.", "Espera el estado Aprobada antes de usarla en conversaciones o envío masivo."],
  },
  {
    id: "campaigns", title: "Crear un envío masivo de WhatsApp", href: "/campaigns", access: "operations",
    question: "¿Cómo preparo un envío masivo de WhatsApp?", keywords: "envio masivo campana campaña whatsapp audiencia plantilla destinatario consentimiento segmentar",
    summary: "Envío masivo usa una plantilla aprobada y una audiencia seleccionada. Crear una campaña prepara el borrador; el envío es una acción posterior.",
    steps: ["Entra en Envío masivo y escribe el nombre de la campaña.", "Selecciona una plantilla aprobada y completa sus variables si las tiene.", "Elige la audiencia por etapas, servicios o contactos y revisa la vista previa y el consentimiento.", "Crea la campaña, revisa el borrador y pulsa Enviar solo cuando quieras iniciar el envío.", "Consulta su estado y pausa la campaña si necesitas detenerla."],
  },
  {
    id: "services", title: "Organizar los servicios del negocio", href: "/services", access: "operations",
    question: "¿Cómo agrego un servicio?", keywords: "servicio servicios producto negocio agregar responsable asignacion formulario meta",
    summary: "Servicios organiza lo que ofrece tu negocio. El administrador asigna responsables y vincula formularios de Meta.",
    steps: ["Entra en Servicios y escribe el nombre en Nuevo servicio.", "Agrega el servicio y revisa que aparezca en la lista.", "Si necesitas asignar un ejecutivo responsable o vincular formularios, pide al administrador que complete esos campos."],
  },
  {
    id: "whatsapp-connection", title: "Revisar la conexión de WhatsApp", href: "/settings/whatsapp", access: "admin",
    question: "¿Dónde reviso la conexión de WhatsApp?", keywords: "conexion conectar vincular numero whatsapp token webhook meta recibir desconectado",
    summary: "La conexión de WhatsApp se administra en Ajustes. Esta ayuda no puede verificar el estado de tu conexión ni consultar sus credenciales.",
    steps: ["Entra en Ajustes → WhatsApp.", "Revisa el estado y los datos de la conexión configurada.", "Completa el proceso de conexión disponible si aún no has conectado el número.", "Si los mensajes no llegan, revisa la configuración de webhook indicada en esa pantalla con quien administra la integración. No compartas tokens en este chat."],
  },
  {
    id: "team", title: "Crear cuentas para el equipo", href: "/settings/team", access: "admin",
    question: "¿Cómo agrego a alguien al equipo?", keywords: "equipo usuario usuarios cuenta acceso invitar miembro rol permisos contrasena restablecer",
    summary: "El administrador crea cuentas y asigna roles en Ajustes → Equipo. Los permisos dependen del rol de cada persona.",
    steps: ["Entra en Ajustes → Equipo y busca Crear cuenta de equipo.", "Completa nombre, correo, rol y contraseña temporal.", "Crea la cuenta y entrega el acceso a la persona por un canal privado.", "Revisa el rol asignado; puedes cambiarlo o restablecer la contraseña desde la lista. Las empresas distintas de la del superadmin tienen un límite de seis miembros."],
  },
  {
    id: "calendar", title: "Conectar el calendario", href: "/settings/calendar", access: "admin",
    question: "¿Cómo conecto el calendario para reuniones?", keywords: "calendario calendar google reunion reuniones agenda agendar horario disponibilidad conectar",
    summary: "Ajustes → Calendario permite conectar Google Calendar para el agendamiento de reuniones, si la integración está configurada en la instancia.",
    steps: ["Entra en Ajustes → Calendario.", "Pulsa Conectar Google Calendar y autoriza la cuenta donde se crearán las reuniones.", "Revisa Cuenta conectada. En Invitados internos agrega los correos del equipo que deben recibir las reuniones y pulsa Guardar ajustes.", "Si la integración no está configurada, solicita su configuración al administrador de la instancia."],
  },
  {
    id: "forms", title: "Conectar formularios del sitio web", href: "/settings/integrations", access: "admin",
    question: "¿Cómo conecto formularios de mi sitio web?", keywords: "formulario web wordpress integracion sitio elementor wpforms contact form endpoint webhook",
    summary: "Formularios web permite crear una integración por formulario y asignar el servicio que recibirán los leads.",
    steps: ["Entra en Ajustes → Integraciones, en la pantalla Formularios web.", "Indica el nombre de la integración y el servicio, y crea la integración.", "Guarda el secreto cuando se muestre y configura el endpoint en tu formulario según la guía de la pantalla.", "Comprueba Última actividad después de una prueba. No compartas el secreto en este chat."],
  },
  {
    id: "notifications", title: "Configurar avisos por correo", href: "/settings/notifications", access: "admin",
    question: "¿Cómo activo los avisos por correo?", keywords: "notificacion aviso alerta correo email lead resumen operativo destinatario",
    summary: "Ajustes → Notificaciones configura avisos operativos por correo, separados de las campañas de Mailing.",
    steps: ["Entra en Ajustes → Notificaciones y activa Notificaciones habilitadas.", "Decide si activas Avisos al entrar un prospecto y Resumen semanal.", "Guarda los cambios. Los avisos van al admin y al responsable del lead; el resumen se distribuye según el equipo.", "Si no llegan los correos, pide al administrador de la instancia que revise el proveedor y remitente del correo operativo."],
  },
  {
    id: "profile", title: "Actualizar tu perfil", href: "/settings/profile", access: "all",
    question: "¿Cómo cambio los datos de mi perfil?", keywords: "perfil cuenta personal foto nombre cambiar datos",
    summary: "Ajustes → Perfil permite actualizar tu nombre y foto. El correo de la cuenta aparece como solo lectura.",
    steps: ["Entra en Ajustes → Perfil.", "Edita tu nombre y pulsa Guardar cambios.", "Para actualizar la imagen, usa Subir foto o Cambiar foto. Puedes quitarla con Quitar."],
  },
  {
    id: "password", title: "Restablecer tu contraseña", href: "/forgot-password", access: "all",
    question: "¿Cómo restablezco mi contraseña?", keywords: "contrasena password recuperar restablecer cambiar acceso olvide clave",
    summary: "Restablecer contraseña permite solicitar un enlace personal por correo para crear una contraseña nueva.",
    steps: ["Abre Restablecer contraseña y escribe el correo de tu cuenta.", "Solicita el enlace y revisa el correo, incluida la carpeta de spam. El enlace vence en 60 minutos.", "Abre el enlace y completa la contraseña nueva.", "Si el correo no llega, pide al administrador que revise la configuración de correo o que restablezca tu contraseña desde Equipo."],
  },
  {
    id: "branding", title: "Personalizar la marca", href: "/settings/branding", access: "admin",
    question: "¿Cómo cambio la marca de mi empresa?", keywords: "marca branding logo nombre empresa color personalizar apariencia",
    summary: "El administrador puede personalizar la marca de su empresa en Ajustes → Marca.",
    steps: ["Entra en Ajustes → Marca.", "Edita los campos de marca disponibles y guarda los cambios.", "Revisa el resultado en la navegación del CRM."],
  },
  {
    id: "mailing", title: "Preparar una campaña de correo", href: "/mailing", access: "mailing",
    question: "¿Cómo creo una campaña de correo?", keywords: "mailing campana campaña email correo lista suscriptor destinatario newsletter boletin",
    summary: "Mailing administra listas, suscriptores y campañas de email de tu empresa, independientemente de WhatsApp. Para enviar necesita un remitente verificado.",
    steps: ["Entra en Mailing y prepara tus listas y suscriptores en Audiencia con su consentimiento registrado.", "En Campañas crea una nueva campaña, elige la lista y completa asunto y contenido.", "Guarda el borrador y revisa el contenido y la audiencia.", "Con el remitente verificado, revisa el envío inmediato o la programación y confirma cuando quieras enviarla.", "Consulta el progreso: aceptación por el proveedor y entrega al buzón son estados distintos."],
  },
  {
    id: "mailing-dns", title: "Verificar el remitente de Mailing", href: "/mailing", access: "mailing_admin",
    question: "¿Cómo verifico el remitente de correo?", keywords: "remitente dns dominio resend verificar dkim spf correo mailing direccion registros",
    summary: "El administrador configura la dirección de envío de Mailing y verifica el dominio mediante los registros DNS mostrados en la pantalla.",
    steps: ["En Mailing abre Remitente y completa el dominio, dirección y nombre de envío.", "Pulsa Guardar remitente y revisa los Registros DNS.", "Añade los registros completos en el proveedor DNS de tu dominio sin reemplazar la configuración de correo existente.", "Pulsa Comprobar DNS después de añadirlos. Espera la verificación antes de enviar; la propagación puede tardar."],
  },
  {
    id: "mailing-sequence", title: "Crear una automatización por días", href: "/mailing", access: "mailing",
    question: "¿Cómo automatizo correos a los 7, 14 y 21 días?", keywords: "automatizacion automatizar secuencia dias 7 14 21 inscripcion mailing seguimiento programa tiempo",
    summary: "Las automatizaciones de Mailing envían pasos por días desde la inscripción de cada suscriptor. Puedes guardar un borrador antes de activar.",
    steps: ["En Mailing abre Automatizaciones y crea un programa para una lista.", "Completa los días, asuntos y contenidos de cada paso. Los días se cuentan desde la inscripción, no desde el correo anterior.", "Revisa si se inscribirán automáticamente los nuevos contactos y guarda el borrador.", "Revisa y confirma la activación. Usa Inscribir contactos existentes si también quieres incluirlos.", "Puedes pausar el programa para impedir nuevos envíos mientras revisas el contenido."],
  },
  {
    id: "companies", title: "Administrar empresas de la instancia", href: "/companies", access: "superadmin",
    question: "¿Cómo habilito Mailing para una empresa?", keywords: "empresa empresas organizacion superadmin habilitar mailing administrador instancia crear",
    summary: "Empresas es exclusiva del superadmin. Allí crea empresas con su administrador y habilita Mailing por empresa.",
    steps: ["Entra en Empresas y localiza la empresa que quieras administrar.", "Para una nueva empresa, completa sus datos y los de su administrador en el formulario de creación.", "Para habilitar Mailing, usa el interruptor Mailing de la empresa correspondiente.", "El admin de esa empresa podrá configurar su remitente después de habilitar el módulo."],
  },
];

const operationalRoles: Role[] = ["owner", "commercial", "marketing"];
export function getHelpGuides(access: HelpAccess): HelpGuide[] {
  const role = normalizeRole(access.role);
  return HELP_GUIDES.filter((guide) => {
    switch (guide.access) {
      case "all": return true;
      case "operations": return operationalRoles.includes(role);
      case "admin": return role === "owner";
      case "agent": return role === "owner" || role === "agent_editor";
      case "superadmin": return access.isSuperadmin;
      case "mailing": return access.mailingEnabled && operationalRoles.includes(role);
      case "mailing_admin": return access.mailingEnabled && role === "owner";
    }
  });
}

export function helpGuideLink(guide: HelpGuide): HelpGuideLink {
  return { id: guide.id, title: guide.title, href: guide.href, steps: guide.steps };
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
const stopWords = new Set("como para puedo quiero donde esta este esto esa ese con una uno unos las los del que por tengo hacer necesito ayuda despues ahora cual cuando herramienta usar uso seomos funciona saber".split(" "));

export function findHelpGuides(question: string, pathname: string, guides: HelpGuide[]): HelpGuide[] {
  const terms = [...new Set(normalize(question).split(/[^a-z0-9]+/).filter((term) => term.length >= 3 && !stopWords.has(term)))];
  const ranked = guides.map((guide) => {
    const keywords = normalize(guide.keywords).split(" ");
    const title = normalize(guide.title);
    let score = 0;
    for (const term of terms) {
      if (keywords.some((key) => key === term || (term.length >= 4 && key.slice(0, 5) === term.slice(0, 5)))) score += 4;
      if (title.includes(term)) score += 2;
    }
    if (score > 0 && guide.href === pathname) score += 1;
    if (terms.length === 0 && guide.href === pathname) score = 1;
    return { guide, score };
  });
  return ranked.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((item) => item.guide);
}

export function getHelpScreen(pathname: string, guides: HelpGuide[]): { pathname: string; title: string } {
  const titles: Record<string, string> = {
    "/inbox": "Bandeja", "/pipeline": "Etapas del prospecto", "/contacts": "Contactos", "/dashboard": "Dashboard",
    "/agent": "Agente", "/templates": "Plantillas", "/campaigns": "Envío masivo", "/services": "Servicios",
    "/mailing": "Mailing", "/companies": "Empresas", "/settings/whatsapp": "WhatsApp", "/settings/team": "Equipo",
    "/settings/calendar": "Calendario", "/settings/profile": "Perfil", "/settings/branding": "Marca", "/forgot-password": "Restablecer contraseña",
    "/settings/notifications": "Notificaciones", "/settings/integrations": "Formularios web",
  };
  const guide = guides.find((item) => item.href === pathname);
  return guide ? { pathname: guide.href, title: titles[guide.href] ?? guide.title } : { pathname: "", title: "Tu CRM" };
}

export function getHelpSuggestions(pathname: string, guides: HelpGuide[]): string[] {
  const contextual = guides.filter((guide) => guide.href === pathname);
  const general = guides.filter((guide) => ["inbox", "pipeline", "agent", "profile"].includes(guide.id));
  return [...new Set([...contextual, ...general].map((guide) => guide.question))].slice(0, 3);
}
