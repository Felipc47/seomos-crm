import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isAiConfigured } from "@/lib/env";
import { withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Estado operativo mínimo para Bandeja. A diferencia de /agent/profile, no
 * expone prompt, tono ni reglas y puede consultarlo cualquier operador
 * autenticado que ya tiene acceso a las conversaciones.
 */
export const GET = withAuth(async (session) => {
  const rows = await getDb()
    .select({ enabled: schema.agentProfile.enabled })
    .from(schema.agentProfile)
    .where(scoped(schema.agentProfile.organizationId, session.organizationId))
    .limit(1);

  return Response.json({
    enabled: rows[0]?.enabled ?? false,
    aiConfigured: isAiConfigured(),
  });
});
