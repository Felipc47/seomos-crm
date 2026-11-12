import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";

export class InitialGreetingSkipped extends Error {
  constructor(public readonly reason: "previous_template" | "contact_restricted") {
    super(reason === "previous_template" ? "Saludo omitido: ya existe una plantilla o un intento previo." : "Saludo omitido: contacto bloqueado, dado de baja o archivado.");
  }
}

/** Serializes only the short reservation, never a network call. All template paths
 * register attempts; only automatic first greetings are suppressed by history. */
export async function reserveTemplateDispatch(input: {
  organizationId: string; contactId: string; templateId: string; automaticGreeting: boolean;
}) {
  return getDb().transaction(async tx => {
    const [contact] = await tx.select().from(schema.contact).where(scoped(schema.contact.organizationId, input.organizationId, eq(schema.contact.id, input.contactId))).for("update");
    if (!contact) throw new Error("Contacto no encontrado");
    if (input.automaticGreeting) {
      if (contact.blockedAt || contact.optedOutAt || contact.archivedAt) throw new InitialGreetingSkipped("contact_restricted");
      const [attempt] = await tx.select({ id: schema.templateDispatch.id }).from(schema.templateDispatch)
        .where(scoped(schema.templateDispatch.organizationId, input.organizationId, eq(schema.templateDispatch.contactId, input.contactId))).limit(1);
      const [message] = await tx.select({ id: schema.message.id }).from(schema.message)
        .innerJoin(schema.conversation, eq(schema.conversation.id, schema.message.conversationId))
        .where(scoped(schema.message.organizationId, input.organizationId, eq(schema.conversation.organizationId, input.organizationId), eq(schema.conversation.contactId, input.contactId), eq(schema.conversation.isTest, false), eq(schema.message.direction, "out"), eq(schema.message.type, "template"))).limit(1);
      if (attempt || message) throw new InitialGreetingSkipped("previous_template");
    }
    const id = newId("templateDispatch");
    await tx.insert(schema.templateDispatch).values({ id, ...input });
    return id;
  });
}

export async function finishTemplateDispatch(organizationId: string, id: string, messageId: string | null) {
  await getDb().update(schema.templateDispatch).set({ status: messageId ? "sent" : "uncertain", messageId, updatedAt: new Date() })
    .where(scoped(schema.templateDispatch.organizationId, organizationId, eq(schema.templateDispatch.id, id)));
}
