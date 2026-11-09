/** Texto de la invitación de calendario, configurable por empresa. */
export const DEFAULT_MEETING_DESCRIPTION =
  "Agendada desde Seomos CRM para {{nombre}} ({{telefono}}).";
export const MAX_MEETING_DESCRIPTION_LENGTH = 4000;

/** Sustitución de una sola pasada: el contenido del contacto se usa literalmente. */
export function renderMeetingDescription(
  template: string = DEFAULT_MEETING_DESCRIPTION,
  contact: { name: string; phone: string }
): string {
  return template.replace(/\{\{(nombre|telefono)\}\}/g, (token) =>
    token === "{{nombre}}" ? contact.name : contact.phone
  );
}
