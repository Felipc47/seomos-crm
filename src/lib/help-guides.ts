import { normalizeRole, type Role } from "@/lib/permissions";
import { OPERATION_HELP_GUIDES } from "@/lib/help-guides-operations";
import { ADMINISTRATION_HELP_GUIDES } from "@/lib/help-guides-administration";
import { MESSAGING_HELP_GUIDES } from "@/lib/help-guides-messaging";
import { findHelpIntent } from "@/lib/help-intents";

export type HelpAccess = { role: string; isSuperadmin: boolean; mailingEnabled: boolean };
export type HelpGuide = {
  id: string;
  title: string;
  href: string;
  question: string;
  summary: string;
  keywords: string;
  steps: string[];
  requirements?: string[];
  result?: string;
  troubleshooting?: string[];
  access: "all" | "operations" | "admin" | "agent" | "superadmin" | "mailing" | "mailing_admin";
};
export type HelpGuideLink = Pick<HelpGuide, "id" | "title" | "href" | "steps" | "requirements" | "result" | "troubleshooting">;

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
    id: "pause-agent", title: "Pausar la IA solo en este chat", href: "/inbox", access: "all",
    question: "¿Cómo desactivo la IA en un chat específico?", keywords: "pausar desactivar inactivar apagar detener silenciar ia bot agente chat conversacion especifico manual",
    summary: "Abre ese chat en Bandeja. En la cabecera, a la derecha del nombre del contacto, apaga el interruptor «IA en esta conversación». Debe pasar de IA activa a IA pausada; los otros chats siguen igual.",
    steps: ["Abre en Bandeja la conversación donde quieres detener las respuestas automáticas.", "En la cabecera, a la derecha del nombre del contacto, localiza el interruptor IA en esta conversación junto al icono de destellos.", "Apaga ese interruptor y espera a que la cabecera muestre IA pausada. El cambio afecta solo a esta conversación.", "Para devolver el chat al agente, enciende el mismo interruptor cuando quieras reactivar la atención."],
  },
  {
    id: "resume-agent", title: "Reactivar la IA en este chat", href: "/inbox", access: "all",
    question: "¿Cómo reactivo la IA en una conversación?", keywords: "reactivar activar encender retomar devolver ia bot agente chat conversacion",
    summary: "En ese chat de Bandeja, enciende el interruptor «IA en esta conversación» de la cabecera. Debe mostrar IA activa. Al reactivarlo puede retomar respuestas pendientes si la ventana de WhatsApp está abierta.",
    steps: ["Abre la conversación que quieres devolver al agente.", "En la cabecera enciende IA en esta conversación y espera a que muestre IA activa.", "Si está deshabilitado y dice IA no disponible, el administrador debe revisar que el agente general esté activado y configurado.", "La reactivación puede retomar una respuesta pendiente con la ventana abierta; fuera de la ventana de 24 horas el agente no puede enviar texto libre."],
  },
  {
    id: "handoff", title: "Atender una conversación personalmente", href: "/inbox", access: "all",
    question: "¿Cómo tomo el control de una conversación?", keywords: "humano tomar control pausar agente conversacion atencion manual bot ia silencio",
    summary: "En el chat de Bandeja, apaga «IA en esta conversación» en la cabecera. Cuando muestre IA pausada, puedes atender personalmente sin nuevas respuestas automáticas del agente.",
    steps: ["Abre la conversación que vas a atender en Bandeja.", "Apaga el interruptor IA en esta conversación en la cabecera, junto al icono de destellos, y espera IA pausada.", "Escribe tu respuesta en Escribe una respuesta… y pulsa Enviar cuando hayas revisado el mensaje. Con la ventana cerrada, usa una plantilla aprobada.", "Cuando quieras devolver la atención al agente, enciende el mismo interruptor."],
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
    steps: ["Entra en Agente. Para prepararlo con ayuda, pulsa Configurar con IA: indica sitio opcional, descripción del negocio, objetivo y límites, y usa Crear borrador.", "Revisa la propuesta y pulsa Usar este borrador para rellenar los campos. Todavía puedes editarlos y no se enciende automáticamente.", "En Comportamiento ajusta Nombre del agente y Saludo. En Tono elige hasta dos presets y completa Matices propios si hace falta.", "Completa las secciones de Entrenamiento del agente con instrucciones precisas y Escalado a humano con los casos que requieren una persona. Knowledge base guarda la información confirmada del negocio.", "Pulsa Guardar comportamiento. Revisa por separado Seguimiento automático y Agendamiento si los vas a utilizar.", "Decide con el interruptor Agente encendido si debe responder automáticamente; necesita proveedor configurado y créditos disponibles. Para detener un solo chat usa el interruptor de su cabecera en Bandeja."],
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
    summary: "En Plantillas → Nueva plantilla completa nombre, idioma, categoría y cuerpo. Pulsa Crear y enviar a aprobación cuando hayas revisado el contenido; solo podrás enviarla a clientes cuando esté Aprobada.",
    steps: ["Entra en Plantillas y localiza Nueva plantilla.", "Completa Nombre (por ejemplo seguimiento_cotizacion), Idioma, Categoría y Cuerpo. Usa UTILITY para el tipo de seguimiento permitido o MARKETING para contenido promocional.", "Si usas variables, escríbelas consecutivamente como {{1}}…{{5}} y configura de dónde sale cada dato y su alternativa cuando falta.", "Si necesitas encabezado, elige Imagen (JPG/PNG, hasta 5 MB) o Documento PDF (hasta 16 MB) y adjunta el archivo. El encabezado no puede añadirse o quitarse después.", "Revisa contenido y variables antes de pulsar Crear y enviar a aprobación. Como comercial/marketing pasa primero por el admin; el admin la aprueba y envía a Meta.", "Espera el estado Aprobada. Usa Sincronizar para actualizarlo o revisa Razón del rechazo si fue Rechazada."],
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
    summary: "Como admin, entra en Ajustes → WhatsApp. Completa WABA ID, Phone Number ID y Token de acceso en esa pantalla; pulsa Probar conexión y, cuando sea válida, Guardar conexión. Después configura el webhook mostrado allí.",
    steps: ["Abre Ajustes → WhatsApp y revisa el estado de la conexión.", "Completa WABA ID, Phone Number ID y Token de acceso usando los datos de tu integración de Meta. Un token ya guardado solo muestra sus últimos cuatro caracteres; escribe otro en esa pantalla si lo vas a sustituir.", "Pulsa Probar conexión. El mensaje debe indicar Token válido antes de habilitar Guardar conexión.", "Pulsa Guardar conexión. La verificación del webhook por sí sola no basta: guardar permite enrutar los mensajes por el Phone Number ID.", "En Webhook de WhatsApp usa Copiar URL y Copiar verify token para configurar tu integración de Meta según esa pantalla. La URL también contiene un secreto; no pegues estos datos en Ayuda.", "Si los mensajes no llegan, pide a quien administra Meta revisar suscripción/eventos y que esté guardado el número correcto. Ayuda no verifica tu token ni lee el estado privado de la conexión."],
  },
  {
    id: "team", title: "Crear cuentas para el equipo", href: "/settings/team", access: "admin",
    question: "¿Cómo agrego a alguien al equipo?", keywords: "equipo usuario usuarios cuenta acceso invitar miembro rol permisos contrasena restablecer",
    summary: "El administrador crea cuentas y asigna roles en Ajustes → Equipo. Los permisos dependen del rol de cada persona.",
    steps: ["Entra en Ajustes → Equipo y busca Crear cuenta de equipo.", "Completa Nombre y Correo, y elige Rol: Admin, Editor de agente, Ejecutivo comercial o Marketing.", "Prepara una Contraseña temporal de al menos ocho caracteres o pulsa Generar. No la compartas en Ayuda.", "Pulsa Crear cuenta y comprueba Cuenta creada. No se envía una invitación automática: guarda y entrega el acceso por un canal privado antes de cerrar el aviso, porque se muestra una vez.", "Revisa al miembro en la lista y su rol. La empresa estándar admite hasta seis usuarios, incluido el admin; la empresa del superadmin tiene la excepción indicada por la pantalla.", "Para un acceso olvidado utiliza Restablecer contraseña en su fila: se envía un enlace al miembro, no se revela su contraseña actual."],
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
    steps: ["Entra en Ajustes → Notificaciones y activa Notificaciones habilitadas, el interruptor maestro de correo operativo.", "Elige Avisos al entrar un prospecto para enviar al admin y al responsable del lead, y Resumen semanal para el panorama del admin y resumen por responsable.", "Pulsa Guardar cambios y comprueba Preferencias guardadas. Los interruptores específicos quedan deshabilitados cuando el maestro está apagado.", "Si no llegan los correos, pide al administrador de la instancia revisar proveedor y remitente del correo operativo. Este remitente y estos avisos son independientes de las campañas de Mailing."],
  },
  {
    id: "profile", title: "Actualizar tu perfil", href: "/settings/profile", access: "all",
    question: "¿Cómo cambio los datos de mi perfil?", keywords: "perfil cuenta personal foto nombre cambiar datos",
    summary: "Ajustes → Perfil permite actualizar tu nombre y foto. El correo de la cuenta aparece como solo lectura.",
    steps: ["Entra en Ajustes → Perfil y revisa Tu perfil.", "En Nombre escribe hasta 80 caracteres y pulsa Guardar cambios. El correo de acceso aparece como solo lectura.", "Para la imagen pulsa Subir foto o Cambiar foto y elige JPG, PNG o WEBP. Se recorta al centro y se guarda en 256×256; la elección guarda la foto.", "Quitar retira la imagen actual. Comprueba nombre/foto en la navegación y en el equipo; cambiar nombre no cambia tu correo ni contraseña."],
  },
  {
    id: "password", title: "Restablecer tu contraseña", href: "/forgot-password", access: "all",
    question: "¿Cómo restablezco mi contraseña?", keywords: "contrasena password recuperar restablecer cambiar acceso olvide clave",
    summary: "Restablecer contraseña permite solicitar un enlace personal por correo para crear una contraseña nueva.",
    steps: ["Abre Restablecer contraseña y escribe el correo de tu cuenta.", "Solicita el enlace y revisa el correo, incluida la carpeta de spam. El enlace vence en 60 minutos.", "Abre el enlace y completa la contraseña nueva.", "Si el correo no llega, pide al administrador que revise la configuración de correo o que restablezca tu contraseña desde Equipo."],
  },
  {
    id: "branding", title: "Personalizar la marca", href: "/settings/branding", access: "admin",
    question: "¿Cómo cambio la marca de mi empresa?", keywords: "marca branding nombre empresa color personalizar apariencia",
    summary: "El administrador puede personalizar la marca de su empresa en Ajustes → Marca.",
    steps: ["Entra en Ajustes → Marca y revisa Marca del CRM.", "Completa Nombre (hasta 30 caracteres) y elige Color de acento de los presets o Personalizado.", "Revisa la vista previa y pulsa Guardar marca.", "Comprueba el nombre/color en la navegación y pantalla de acceso. Esta pantalla configura nombre y color; no muestra una función de subir logo."],
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
    steps: ["En Mailing abre Automatizaciones y pulsa Nueva automatización. Completa Nombre y la lista de destinatarios.", "Prepara los pasos con Día desde inscripción, Asunto y Mensaje. Puedes añadir hasta 20 pasos, con días enteros de 0 a 3650 estrictamente crecientes; para 7, 14 y 21 días configura esos tres pasos.", "Los días se cuentan desde la inscripción de cada persona, no desde el correo anterior. Día 0 corresponde al día de inscripción.", "Revisa cada Vista previa paso… y pulsa Guardar borrador. Enviar prueba paso… va al operador y requiere remitente verificado y cambios guardados.", "Decide si se inscribirán automáticamente los nuevos contactos, pulsa Revisar activación y comprueba los datos antes de Activar automatización.", "Para añadir los contactos actuales utiliza Inscribir contactos existentes después de activar. Las inscripciones previas conservan su reloj; revisa Contactos inscritos y usa Detener inscripción para una persona.", "Puedes Pausar/Reanudar o Cancelar programa para los pendientes. Duplicar crea una nueva versión en borrador; estas acciones no retiran correos ya enviados."],
  },
  {
    id: "companies", title: "Administrar empresas de la instancia", href: "/companies", access: "superadmin",
    question: "¿Cómo habilito Mailing para una empresa?", keywords: "empresa empresas organizacion superadmin habilitar mailing administrador instancia crear",
    summary: "Empresas es exclusiva del superadmin. Allí crea empresas con su administrador y habilita Mailing por empresa.",
    steps: ["Entra en Empresas y localiza la empresa que quieras administrar.", "Para una nueva empresa, completa sus datos y los de su administrador en el formulario de creación.", "Para habilitar Mailing, usa el interruptor Mailing de la empresa correspondiente.", "El admin de esa empresa podrá configurar su remitente después de habilitar el módulo."],
  },
  ...OPERATION_HELP_GUIDES,
  ...ADMINISTRATION_HELP_GUIDES,
  ...MESSAGING_HELP_GUIDES,
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
  return { id: guide.id, title: guide.title, href: guide.href, steps: guide.steps, requirements: guide.requirements, result: guide.result, troubleshooting: guide.troubleshooting };
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
const stopWords = new Set("como para puedo quiero donde esta este esto esa ese con una uno unos las los del que por tengo hacer necesito ayuda despues ahora cual cuando herramienta usar uso seomos funciona saber".split(" "));

export function findHelpGuides(question: string, pathname: string, guides: HelpGuide[]): HelpGuide[] {
  const normalized = normalize(question);
  const intent = findHelpIntent(normalized, pathname);
  if (intent) { const guide = guides.find((item) => item.id === intent); return guide ? [guide] : []; }
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
  pathname = ({ "/settings/services": "/services", "/settings/templates": "/templates" } as Record<string, string>)[pathname] ?? pathname;
  const titles: Record<string, string> = {
    "/inbox": "Bandeja", "/pipeline": "Etapas del prospecto", "/contacts": "Contactos", "/dashboard": "Dashboard",
    "/agent": "Agente", "/templates": "Plantillas", "/campaigns": "Envío masivo", "/services": "Servicios",
    "/mailing": "Mailing", "/companies": "Empresas", "/settings/whatsapp": "WhatsApp", "/settings/team": "Equipo",
    "/settings/calendar": "Calendario", "/settings/profile": "Perfil", "/settings/branding": "Marca", "/forgot-password": "Restablecer contraseña",
    "/settings/notifications": "Avisos por correo", "/settings/integrations": "Formularios web", "/notifications": "Notificaciones",
  };
  const guide = guides.find((item) => item.href === pathname);
  return guide ? { pathname: guide.href, title: titles[guide.href] ?? guide.title } : { pathname: "", title: "Tu CRM" };
}

export function getHelpSuggestions(pathname: string, guides: HelpGuide[]): string[] {
  const preferred: Record<string, string[]> = {
    "/contacts": ["contacts-export", "contacts-import", "contacts-create"],
    "/inbox": ["inbox", "pause-agent", "inbox-transfer"],
    "/agent": ["agent", "knowledge", "agent-followup"],
    "/mailing": ["mailing", "mailing-sequence", "mailing-import"],
  };
  const priority = (preferred[pathname] ?? []).flatMap((id) => { const guide = guides.find((item) => item.id === id); return guide ? [guide] : []; });
  const contextual = guides.filter((guide) => guide.href === pathname);
  const general = guides.filter((guide) => ["inbox", "pipeline", "agent", "profile"].includes(guide.id));
  return [...new Set([...priority, ...contextual, ...general].map((guide) => guide.question))].slice(0, 3);
}

export function searchHelpGuides(query: string, guides: HelpGuide[]): HelpGuide[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return guides.filter((guide) => terms.every((term) => normalize(`${guide.title} ${guide.question} ${guide.keywords}`).includes(term)));
}
