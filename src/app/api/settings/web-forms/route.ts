import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { getEnv } from "@/lib/env";
import { canManageOrgSettings } from "@/lib/permissions";
import type { WebFormIntegrationDto } from "@/lib/types";
import { generateWebFormSecret } from "@/server/web-forms/credentials";

export const dynamic = "force-dynamic";

function endpoint(id: string): string {
  return `${getEnv().APP_BASE_URL.replace(/\/$/, "")}/api/integrations/forms/${id}/submissions`;
}

function serialize(row: {
  integration: typeof schema.webFormIntegration.$inferSelect;
  serviceName: string | null;
}): WebFormIntegrationDto {
  return {
    id: row.integration.id,
    name: row.integration.name,
    serviceId: row.integration.serviceId,
    serviceName: row.serviceName,
    enabled: row.integration.enabled,
    secretLast4: row.integration.secretLast4,
    endpoint: endpoint(row.integration.id),
    lastUsedAt: row.integration.lastUsedAt?.toISOString() ?? null,
    lastStatus: row.integration.lastStatus,
    lastError: row.integration.lastError,
    createdAt: row.integration.createdAt.toISOString(),
  };
}

function forbidden(): Response {
  return apiError(
    403,
    "forbidden",
    "Solo el admin de la empresa puede gestionar integraciones"
  );
}

export const GET = withAuth(async (session) => {
  if (!canManageOrgSettings(session.role)) return forbidden();
  const db = getDb();
  const [rows, services] = await Promise.all([
    db
      .select({
        integration: schema.webFormIntegration,
        serviceName: schema.service.name,
      })
      .from(schema.webFormIntegration)
      .leftJoin(
        schema.service,
        and(
          eq(schema.service.id, schema.webFormIntegration.serviceId),
          eq(schema.service.organizationId, session.organizationId)
        )
      )
      .where(
        scoped(
          schema.webFormIntegration.organizationId,
          session.organizationId
        )
      )
      .orderBy(asc(schema.webFormIntegration.createdAt)),
    db
      .select({ id: schema.service.id, name: schema.service.name })
      .from(schema.service)
      .where(scoped(schema.service.organizationId, session.organizationId))
      .orderBy(asc(schema.service.name)),
  ]);
  return Response.json({ integrations: rows.map(serialize), services });
});

const createSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    serviceId: z.string().trim().min(1).nullable().default(null),
  })
  .strict();

export const POST = withAuth(async (session, req: Request) => {
  if (!canManageOrgSettings(session.role)) return forbidden();
  const body = await parseBody(req, createSchema);
  if (!body.ok) return body.response;
  const db = getDb();
  if (body.data.serviceId) {
    const service = await db
      .select({ id: schema.service.id })
      .from(schema.service)
      .where(
        scoped(
          schema.service.organizationId,
          session.organizationId,
          eq(schema.service.id, body.data.serviceId)
        )
      )
      .limit(1);
    if (!service[0]) {
      return apiError(422, "invalid_service", "Servicio no válido");
    }
  }

  const id = newId("webFormIntegration");
  const { secret, encrypted } = generateWebFormSecret();
  const inserted = await db
    .insert(schema.webFormIntegration)
    .values({
      id,
      organizationId: session.organizationId,
      name: body.data.name,
      serviceId: body.data.serviceId,
      ...encrypted,
    })
    .returning();
  return Response.json(
    {
      integration: serialize({
        integration: inserted[0]!,
        serviceName: null,
      }),
      secret,
    },
    { status: 201 }
  );
});
