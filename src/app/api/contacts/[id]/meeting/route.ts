import { apiError, parseBody, withAuth } from "@/lib/api";
import { meetingInputSchema } from "@/lib/meeting";
import { getContactById } from "@/server/contacts";
import { getCalendarSettings } from "@/server/org-settings";
import { cancelMeeting, getMeeting, MeetingBusyError, saveMeeting, serializeMeeting } from "@/server/meetings/repository";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
export const GET = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  if (!await getContactById(session.organizationId, id)) return apiError(404, "not_found", "Contacto no encontrado");
  const [meeting, settings] = await Promise.all([getMeeting(session.organizationId, id), getCalendarSettings(session.organizationId)]);
  return Response.json({ meeting: meeting ? serializeMeeting(meeting) : null, timezone: settings.timezone });
});
export const PUT = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  if (!await getContactById(session.organizationId, id)) return apiError(404, "not_found", "Contacto no encontrado");
  const body = await parseBody(req, meetingInputSchema);
  if (!body.ok) return body.response;
  const startAt = new Date(body.data.startIso);
  if (startAt <= new Date()) return apiError(422, "past_meeting", "La reunión debe tener una fecha y hora futuras");
  const settings = await getCalendarSettings(session.organizationId);
  try {
    const meeting = await saveMeeting({ organizationId: session.organizationId, contactId: id, title: body.data.title ?? "Reunión", startAt, meetLink: body.data.meetLink, timezone: settings.timezone, reminderEnabled: body.data.reminderEnabled, source: "manual" });
    return Response.json({ meeting: serializeMeeting(meeting) });
  } catch (err) {
    if (err instanceof MeetingBusyError) return apiError(409, "meeting_busy", err.message);
    throw err;
  }
});
export const DELETE = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  if (!await getContactById(session.organizationId, id)) return apiError(404, "not_found", "Contacto no encontrado");
  try { await cancelMeeting(session.organizationId, id); return Response.json({ ok: true }); }
  catch (err) { if (err instanceof MeetingBusyError) return apiError(409, "meeting_busy", err.message); throw err; }
});
