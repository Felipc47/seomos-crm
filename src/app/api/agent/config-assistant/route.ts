import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { canEditAgent } from "@/lib/permissions";
import {
  AGENT_CONFIGURATION_GOALS,
  generateAgentConfigurationDraft,
} from "@/server/ai/config-assistant";
import {
  readPublicWebsite,
  WebsiteReadError,
  type WebsiteContext,
} from "@/server/ai/website-reader";

export const dynamic = "force-dynamic";

const requestSchema = z
  .object({
    websiteUrl: z.string().trim().max(2_048).optional().default(""),
    businessDescription: z.string().trim().max(3_000).optional().default(""),
    goal: z.enum(AGENT_CONFIGURATION_GOALS),
    limits: z.string().trim().max(2_000).optional().default(""),
  })
  .refine((value) => Boolean(value.websiteUrl || value.businessDescription), {
    message: "Agrega el sitio web o una descripción breve del negocio",
    path: ["businessDescription"],
  });

export const POST = withAuth(async (session, req: Request) => {
  if (!canEditAgent(session.role)) {
    return apiError(403, "forbidden", "Tu rol no puede configurar el agente");
  }

  const body = await parseBody(req, requestSchema);
  if (!body.ok) return body.response;

  let websiteContext: WebsiteContext | undefined;
  let websiteWarning: string | null = null;
  if (body.data.websiteUrl) {
    try {
      websiteContext = await readPublicWebsite(body.data.websiteUrl);
    } catch (error) {
      if (!(error instanceof WebsiteReadError)) throw error;
      if (error.code === "unsafe_url" || error.code === "invalid_url") {
        return apiError(422, error.code, error.message);
      }
      if (!body.data.businessDescription) {
        return apiError(422, error.code, error.message);
      }
      websiteWarning = `${error.message}. Generamos la propuesta usando tu descripción.`;
    }
  }

  const generated = await generateAgentConfigurationDraft({
    businessDescription: body.data.businessDescription ?? "",
    goal: body.data.goal,
    limits: body.data.limits ?? "",
    websiteContext,
  });
  if (!generated.ok) {
    if (generated.error === "not_configured") {
      return apiError(
        503,
        "ai_not_configured",
        "Configura el proveedor de IA para usar este asistente"
      );
    }
    return apiError(
      503,
      "generation_failed",
      "La IA no pudo preparar el borrador esta vez. Tus respuestas siguen aquí para reintentar"
    );
  }

  return Response.json({
    draft: generated.data,
    website: {
      used: Boolean(websiteContext),
      finalUrl: websiteContext?.url ?? null,
      warning: websiteWarning,
    },
  });
});
