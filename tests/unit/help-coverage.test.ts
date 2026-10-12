import { afterEach, describe, expect, it, vi } from "vitest";
import { HELP_GUIDES, findHelpGuides, getHelpGuides, searchHelpGuides, type HelpAccess } from "@/lib/help-guides";
import { answerHelpQuestion } from "@/server/ai/help-assistant";

const admin: HelpAccess = { role: "owner", isSuperadmin: true, mailingEnabled: true };
const operational: HelpAccess = { role: "commercial", isSuperadmin: false, mailingEnabled: true };
const cases = [
  ["como descargo mis leads", "/inbox", "contacts-export"],
  ["necesito exportar mis contactos", "/inbox", "contacts-export"],
  ["bajar prospectos a Excel", "/pipeline", "contacts-export"],
  ["importar contactos con teléfono y correo", "/contacts", "contacts-import"],
  ["importar correos a Mailing", "/mailing", "mailing-import"],
  ["crear un nuevo contacto", "/contacts", "contacts-create"],
  ["ver archivados en contactos", "/contacts", "contacts-archive"],
  ["dar de baja un contacto de WhatsApp", "/contacts", "contacts-consent"],
  ["eliminar un contacto", "/contacts", "contacts-delete"],
  ["filtrar chats no leídos", "/inbox", "inbox-search"],
  ["transferir un chat a otro responsable", "/inbox", "inbox-transfer"],
  ["anclar un chat arriba", "/inbox", "inbox-pin"],
  ["archivar una conversación", "/inbox", "inbox-archive"],
  ["seleccionar varios chats", "/inbox", "inbox-bulk"],
  ["bloquear un chat", "/inbox", "inbox-block"],
  ["reportar una conversación", "/inbox", "inbox-report"],
  ["borrar el historial de un chat", "/inbox", "inbox-delete"],
  ["guardar notas de un cliente", "/inbox", "inbox-details"],
  ["adjuntar un documento PDF", "/inbox", "inbox-attachments"],
  ["grabar una nota de voz", "/inbox", "inbox-voice"],
  ["agendar una reunión manualmente", "/inbox", "manual-meeting"],
  ["crear una nueva etapa", "/pipeline", "pipeline-stages"],
  ["marcar un prospecto perdido con motivo", "/pipeline", "pipeline-close"],
  ["dashboard entre dos fechas", "/dashboard", "dashboard-range"],
  ["qué significa la conversión del dashboard", "/dashboard", "dashboard-metrics"],
  ["configurar agente con IA usando el sitio web", "/agent", "agent-setup"],
  ["cambiar el tono del agente", "/agent", "agent-training"],
  ["consultar el saldo de créditos de IA", "/agent", "agent-credits"],
  ["configurar seguimiento automático", "/agent", "agent-followup"],
  ["cambiar horario de agendamiento", "/agent", "agent-scheduling"],
  ["eliminar una entrada de knowledge", "/agent", "knowledge-delete"],
  ["agregar políticas al conocimiento del agente", "/agent", "knowledge-block"],
  ["personalizar variables de una plantilla", "/templates", "templates-variables"],
  ["sincronizar plantillas pendientes", "/templates", "templates-sync"],
  ["aprobar una plantilla del comercial", "/templates", "templates-approval"],
  ["editar el texto de una plantilla", "/templates", "templates-edit"],
  ["saludo automático de leads de Meta", "/templates", "templates-greeting"],
  ["filtrar audiencia de campaña WhatsApp", "/campaigns", "campaigns-audience"],
  ["pausar una campaña WhatsApp", "/campaigns", "campaigns-control"],
  ["campaña WhatsApp con fallidos", "/campaigns", "campaigns-errors"],
  ["crear una lista de correo", "/mailing", "mailing-lists"],
  ["añadir un suscriptor", "/mailing", "mailing-subscribers"],
  ["quitar a un suscriptor de una lista", "/mailing", "mailing-consent"],
  ["enviar una prueba de correo", "/mailing", "mailing-test"],
  ["programar campaña de email", "/mailing", "mailing-schedule"],
  ["duplicar una automatización de Mailing", "/mailing", "mailing-control"],
  ["inscribir contactos existentes en Mailing", "/mailing", "mailing-enroll"],
  ["detener inscripción de un suscriptor", "/mailing", "mailing-stop-enrollment"],
  ["ver entregas de Mailing", "/mailing", "mailing-status"],
  ["activar aperturas y clics en Mailing", "/mailing", "mailing-tracking"],
  ["ver aperturas y clics de Mailing", "/mailing", "mailing-status"],
  ["asignar ejecutivo a un servicio", "/services", "services-assignment"],
  ["vincular un formulario Meta a un servicio", "/services", "services-forms"],
  ["cambiar saludo de un servicio", "/services", "services-greeting"],
  ["rotar secreto de un formulario", "/settings/integrations", "forms-manage"],
  ["cambiar rol de un usuario del equipo", "/settings/team", "team-roles"],
  ["restablecer contraseña de un compañero", "/settings/team", "team-password"],
  ["configurar invitados internos de calendario", "/settings/calendar", "calendar-settings"],
  ["desconectar Google Calendar", "/settings/calendar", "calendar-disconnect"],
  ["recargar créditos a una empresa", "/companies", "companies-credits"],
  ["restaurar una empresa eliminada", "/companies", "companies-delete"],
] as const;

describe("cobertura de tareas reales del CRM", () => {
  it.each(cases)("%s encuentra la documentación de %s", (question, pathname, expected) => {
    expect(findHelpGuides(question, pathname, getHelpGuides(admin))[0]?.id).toBe(expected);
  });
  it("tiene IDs únicos, rutas internas e instrucciones con texto", () => {
    expect(new Set(HELP_GUIDES.map((guide) => guide.id)).size).toBe(HELP_GUIDES.length);
    for (const guide of HELP_GUIDES) {
      expect(guide.href).toMatch(/^\/(?!\/)/);
      expect(guide.steps.length).toBeGreaterThan(0);
      expect(guide.steps.every((step) => step.trim().length > 15)).toBe(true);
    }
  });
  it("el índice busca sin tildes y conserva las fronteras de permisos", () => {
    expect(searchHelpGuides("exportacion", getHelpGuides(operational)).map((guide) => guide.id)).toContain("contacts-export");
    const editor = getHelpGuides({ role: "agent_editor", isSuperadmin: false, mailingEnabled: true });
    expect(searchHelpGuides("exportar", editor)).toEqual([]);
    expect(findHelpGuides("recargar créditos a una empresa", "/companies", getHelpGuides(operational))).toEqual([]);
    expect(getHelpGuides({ ...operational, mailingEnabled: false }).every((guide) => !guide.href.startsWith("/mailing"))).toBe(true);
    expect(findHelpGuides("ver aperturas de Mailing", "/mailing", getHelpGuides(operational))[0]?.id).toBe("mailing-status");
    expect(findHelpGuides("activar aperturas de Mailing", "/mailing", getHelpGuides(operational))).toEqual([]);
  });
});

describe("regresión de las preguntas reportadas por el dueño", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(["como descargo mis leads", "necesito exportar mis contactos"])("%s no se delega al proveedor ni niega la función", async (question) => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const reply = await answerHelpQuestion({ question, pathname: "/inbox" }, operational);
    expect(reply.answer).toContain("Exportar CSV");
    expect(reply.answer).toContain("archivados");
    expect(reply.guides[0]?.id).toBe("contacts-export");
    expect(reply.guides[0]?.steps.join(" ")).toContain("contactos.csv");
    expect(reply.notice).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
