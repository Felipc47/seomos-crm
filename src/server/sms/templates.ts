import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { parseStoredVariables, resolveTemplateVariables } from "@/server/whatsapp/template-vars";
import { loadVariableContext, renderBody } from "@/server/whatsapp/templates";
import { SmsError } from "./errors";

export async function renderSmsTemplate(
  organizationId: string,
  templateId: string,
  contact: typeof schema.contact.$inferSelect
) {
  const db = getDb();
  const [[template], [organization]] = await Promise.all([
    db.select().from(schema.template)
      .where(scoped(schema.template.organizationId, organizationId, eq(schema.template.id, templateId))).limit(1),
    db.select({ name: schema.organization.name }).from(schema.organization)
      .where(eq(schema.organization.id, organizationId)).limit(1),
  ]);
  if (!template || template.status !== "approved") {
    throw new SmsError("invalid_template", "Selecciona una plantilla aprobada de esta empresa.", 422);
  }

  const mapping = parseStoredVariables(template.variables);
  let values: string[] | undefined;
  if (mapping) {
    const resolved = resolveTemplateVariables(mapping, await loadVariableContext(organizationId, contact));
    if (!resolved.ok) throw new SmsError("missing_template_variable", `Falta ${resolved.missing} para personalizar el SMS.`, 422);
    values = resolved.values;
  }
  const body = renderBody(template.body, values ?? (contact.name.trim().split(/\s+/)[0] || "Hola")).trim();
  if (!body || /\{\{\s*\d+\s*\}\}/.test(body)) {
    throw new SmsError("invalid_template", "No se pudieron completar las variables de la plantilla SMS.", 422);
  }
  const brand = organization?.name.trim() || "Empresa";
  const content = body.toLowerCase().includes(brand.toLowerCase()) ? body : `${brand}: ${body}`;
  if (content.length > 1600) throw new SmsError("invalid_template", "La plantilla supera el límite de 1600 caracteres del SMS.", 422);
  return content;
}
