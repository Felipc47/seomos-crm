import { desc } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  isMultipart,
  parseTemplateMultipart,
} from "@/app/api/templates/multipart";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import {
  canWriteTemplates,
  templatesRequireApproval,
} from "@/lib/permissions";
import { notifyOrgApprovers } from "@/server/notifications";
import {
  createTemplate,
  serializeTemplate,
  TemplateError,
  templateErrorStatus,
} from "@/server/whatsapp/templates";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const db = getDb();
  const templates = await db
    .select()
    .from(schema.template)
    .where(scoped(schema.template.organizationId, session.organizationId))
    .orderBy(desc(schema.template.createdAt));
  return Response.json({ templates: templates.map(serializeTemplate) });
});

const variableSchema = z.object({
  source: z.enum([
    "first_name",
    "name",
    "phone",
    "email",
    "notes",
    "service",
    "stage",
    "fixed",
  ]),
  value: z.string().trim().max(500).nullish(),
  fallback: z.string().trim().max(500).nullish(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  language: z.string().trim().min(2).max(10),
  category: z.enum(["UTILITY", "MARKETING"]),
  body: z.string().trim().min(1).max(1024),
  /** Mapeo de variables (018); ausente = plantilla legacy. */
  variables: z.array(variableSchema).max(5).optional(),
});

export const POST = withAuth(async (session, req: Request) => {
  if (!canWriteTemplates(session.role)) {
    return apiError(403, "forbidden", "Tu rol no puede crear plantillas");
  }

  // Multipart cuando trae archivo de encabezado (016); JSON como siempre.
  let data: z.infer<typeof createSchema> & {
    header?: Parameters<typeof createTemplate>[1]["header"];
  };
  if (isMultipart(req)) {
    const parsed = await parseTemplateMultipart(req, createSchema);
    if (!parsed.ok) return apiError(422, "invalid", parsed.message);
    data = { ...parsed.fields, header: parsed.header };
  } else {
    const body = await parseBody(req, createSchema);
    if (!body.ok) return body.response;
    data = body.data;
  }

  const requiresApproval = templatesRequireApproval(session.role);
  try {
    const template = await createTemplate(session.organizationId, data, {
      requiresApproval,
      requestedById: requiresApproval ? session.userId : null,
    });
    if (requiresApproval) {
      // Aviso a quienes aprueban: el admin de la empresa y el superadmin.
      await notifyOrgApprovers(session.organizationId, {
        type: "template_approval",
        title: "Plantilla por aprobar",
        body: `«${template.name}» espera tu aprobación antes de enviarse a Meta`,
        href: "/templates",
        excludeUserId: session.userId,
      });
    }
    return Response.json(
      { template: serializeTemplate(template) },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof TemplateError) {
      return apiError(templateErrorStatus(err), err.code, err.message);
    }
    throw err;
  }
});
