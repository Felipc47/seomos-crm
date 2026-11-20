import { apiError, withAuth } from "@/lib/api";
import { canManageMailing } from "@/lib/permissions";
import { openSmsCrmContact } from "@/server/sms/crm-contact";
import { smsApiError } from "@/server/sms/errors";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export const POST = withAuth(async (session, _req: Request, ctx: Params) => {
  if (!canManageMailing(session.role)) return apiError(403, "forbidden", "Sin permiso para operar SMS.");
  try {
    const contact = await openSmsCrmContact(session.organizationId, (await ctx.params).id);
    return Response.json({ contact: { id: contact.id, name: contact.name, phone: contact.phone } });
  } catch (error) {
    return smsApiError(error);
  }
});
