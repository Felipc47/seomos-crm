import { after } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  bearerSecret,
  webFormSecretMatches,
} from "@/server/web-forms/credentials";
import {
  parseWebFormRequest,
  WebFormRequestError,
} from "@/server/web-forms/contract";
import {
  ingestWebFormSubmission,
  runWebFormPostProcessing,
} from "@/server/web-forms/ingest";
import {
  consumeWebFormRateLimit,
  webFormClientIp,
} from "@/server/web-forms/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ integrationId: string }> };

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(req: Request, { params }: Params): Promise<Response> {
  const { integrationId } = await params;
  if (
    !consumeWebFormRateLimit(integrationId, webFormClientIp(req))
  ) {
    return errorResponse(
      429,
      "rate_limited",
      "Demasiados intentos; vuelve a intentarlo en un minuto"
    );
  }

  const rows = await getDb()
    .select({
      id: schema.webFormIntegration.id,
      organizationId: schema.webFormIntegration.organizationId,
      name: schema.webFormIntegration.name,
      serviceId: schema.webFormIntegration.serviceId,
      enabled: schema.webFormIntegration.enabled,
      secretCipher: schema.webFormIntegration.secretCipher,
      secretIv: schema.webFormIntegration.secretIv,
      secretTag: schema.webFormIntegration.secretTag,
      secretLast4: schema.webFormIntegration.secretLast4,
    })
    .from(schema.webFormIntegration)
    .innerJoin(
      schema.organization,
      eq(schema.organization.id, schema.webFormIntegration.organizationId)
    )
    .where(
      and(
        eq(schema.webFormIntegration.id, integrationId),
        isNull(schema.organization.deletedAt)
      )
    )
    .limit(1);
  const integration = rows[0];
  const candidate = bearerSecret(req);
  if (
    !integration ||
    !integration.enabled ||
    !candidate ||
    !webFormSecretMatches(candidate, integration)
  ) {
    return errorResponse(401, "unauthorized", "Credenciales no válidas");
  }

  let input;
  try {
    input = await parseWebFormRequest(req);
  } catch (error) {
    if (error instanceof WebFormRequestError) {
      await getDb()
        .update(schema.webFormIntegration)
        .set({
          lastUsedAt: new Date(),
          lastStatus: "failed",
          lastError: error.message,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(
              schema.webFormIntegration.organizationId,
              integration.organizationId
            ),
            eq(schema.webFormIntegration.id, integration.id)
          )
        );
      return errorResponse(error.status, error.code, error.message);
    }
    throw error;
  }

  try {
    const context = {
      id: integration.id,
      organizationId: integration.organizationId,
      name: integration.name,
      serviceId: integration.serviceId,
    };
    const result = await ingestWebFormSubmission(context, input);
    if (!result.duplicate) {
      after(async () => {
        await runWebFormPostProcessing(context, result);
      });
    }
    return Response.json(
      result.duplicate
        ? { status: "duplicate", submissionId: result.submissionId }
        : {
            status: "processed",
            submissionId: result.submissionId,
            contactId: result.contactId,
            leadId: result.leadId,
          },
      { status: result.duplicate ? 200 : 201 }
    );
  } catch {
    console.error(
      `[web-form] no se pudo completar una entrega para ${integration.id}`
    );
    return errorResponse(
      503,
      "temporarily_unavailable",
      "No se pudo procesar ahora; reintenta el mismo identificador"
    );
  }
}
