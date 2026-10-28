import { customerRequestsMeeting, schedulingOfferPolicy } from "@/lib/agent-mission";
import { guardSchedulingAction } from "./mission-policy";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { chatJson } from "@/lib/ai";
import type { DemoRequest, DemoReply } from "@/lib/agent-demo";
import { AgentAction, degradeAction, resolveStage, type AgentActionType } from "@/server/ai/actions";
import { buildAgentSystemPrompt } from "@/server/ai/prompts";
import { matchesHandoffIntent } from "@/server/ai/handoff";

/** Convierte intención a vista previa. No importa ni llama ejecutores del CRM. */
export function previewAgentAction(action: AgentActionType): DemoReply {
  const text = (value: string | undefined) => value?.slice(0, 4096) || null;
  switch (action.action) {
    case "commerce_search": return {message:null,actionLabel:"Simulación: consultar productos de la tienda. La demo no llama al ecommerce.",ended:false};
    case "commerce_prepare": return {message:null,actionLabel:"Simulación: revisar el resumen del pedido con el cliente. No se crea un pedido real.",ended:false};
    case "commerce_confirm": return {message:null,actionLabel:"Simulación: registrar pedido sin pagar tras confirmación. No se crea un pedido real.",ended:false};
    case "commerce_order_status": return {message:null,actionLabel:"Simulación: consultar estado del pedido del cliente actual.",ended:false};
    case "reply": return { message: text(action.text), actionLabel: null, ended: false };
    case "none": return { message: null, actionLabel: "El agente no enviaría una respuesta en este turno.", ended: false };
    case "update_lead": return { message: text(action.reply), actionLabel: "Simulación: actualizar la ficha del prospecto.", ended: false };
    case "move_stage": return { message: text(action.reply), actionLabel: `Simulación: mover a «${action.stage}».`, ended: false };
    case "handoff": return { message: text(action.farewell), actionLabel: "Simulación: entregar la conversación a una persona.", ended: true };
    case "follow_up_later": return { message: text(action.reply), actionLabel: "Simulación: programar un seguimiento.", ended: false };
    case "schedule_meeting": return { message: text(action.reply), actionLabel: "Simulación: solicitar el agendamiento de una reunión. El calendario real no se consulta.", ended: false };
  }
}

export async function answerAgentDemo(organizationId: string, input: DemoRequest) {
  const db = getDb();
  const [profiles, kb, stages, services] = await Promise.all([
    db.select().from(schema.agentProfile).where(scoped(schema.agentProfile.organizationId, organizationId)).limit(1),
    db.select().from(schema.kbEntry).where(scoped(schema.kbEntry.organizationId, organizationId)).orderBy(asc(schema.kbEntry.createdAt)),
    db.select({ id: schema.pipelineStage.id, name: schema.pipelineStage.name, kind: schema.pipelineStage.kind })
      .from(schema.pipelineStage).where(scoped(schema.pipelineStage.organizationId, organizationId)).orderBy(asc(schema.pipelineStage.position)),
    db.select({ id: schema.service.id, name: schema.service.name })
      .from(schema.service).where(scoped(schema.service.organizationId, organizationId)),
  ]);
  const savedProfile = profiles[0];
  if (!savedProfile) return { ok: false as const, error: "profile_not_found" as const };
  const profile = { ...savedProfile, ...input.configuration };
  if (matchesHandoffIntent(input.message)) {
    return { ok: true as const, data: previewAgentAction({ action: "handoff" }) };
  }
  const history = input.history ?? [];
  const offerPolicy = schedulingOfferPolicy(profile, {
    sentAgentMessages: history.filter(message => message.role === "assistant").length,
    customerRequestedMeeting: customerRequestsMeeting([...history.filter(message => message.role === "user").map(message => message.content), input.message]),
  });
  const commerceDemo=profile.mission==="ecommerce"?"ECOMMERCE EN DEMO: puedes simular commerce_search(query), commerce_prepare(items:[{id,quantity}],buyer:{name,email,address,city,country}), commerce_confirm y commerce_order_status(reference). No consultes tienda real ni inventes stock/precios/pagos; las acciones se previsualizan sin ejecutar.":"";
  const result = await chatJson(AgentAction, [
    { role: "system", content: `[CHAT_DEMO_CONFIGURACION]\n${buildAgentSystemPrompt({ profile, kb, stages, services, calendarAvailable: true, offerPolicy })}\n${commerceDemo}\nCONTEXTO DE DEMOSTRACIÓN: conversa con el cliente usando la configuración anterior. Puedes indicar las mismas acciones, pero solo se previsualizan: no se envían mensajes ni se crean contactos, cambios, seguimientos o reuniones. El calendario es simulado: no afirmes disponibilidad real y no prometas que una reunión fue creada; cuando el cliente confirme, schedule_meeting representa una solicitud simulada.` },
    ...history,
    { role: "user", content: input.message },
  ], { timeoutMs: 15000 });
  if (!result.ok) return { ok: false as const, error: result.error };
  const action = result.data.action === "move_stage" && !resolveStage(result.data.stage, stages)
    ? degradeAction(result.data) : result.data;
  return { ok: true as const, data: previewAgentAction(guardSchedulingAction(action, offerPolicy, profile, input.message)) };
}
