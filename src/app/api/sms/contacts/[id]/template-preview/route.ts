import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { canManageMailing } from "@/lib/permissions";
import { openSmsCrmContact } from "@/server/sms/crm-contact";
import { smsApiError } from "@/server/sms/errors";
import { renderSmsTemplate } from "@/server/sms/templates";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
const input = z.object({ templateId: z.string().trim().min(1).max(100) }).strict();

export const POST = withAuth(async (session, req: Request, ctx: Params) => {
  if (!canManageMailing(session.role)) return apiError(403, "forbidden", "Sin permiso para operar SMS.");
  const body = await parseBody(req, input);
  if (!body.ok) return body.response;
  try {
    const org = session.organizationId;
    const contact = await openSmsCrmContact(org, (await ctx.params).id);
    return Response.json({ content: await renderSmsTemplate(org, body.data.templateId, contact) });
  } catch (error) {
    return smsApiError(error);
  }
});
