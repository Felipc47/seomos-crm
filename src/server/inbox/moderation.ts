import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import type { ContactReportReason } from "@/lib/types";
import { publish } from "@/server/events/bus";
import {
  blockWhatsAppUsers,
  BlockedUsersError,
  unblockWhatsAppUsers,
} from "@/server/whatsapp/blocked-users";

export const reportReasonSchema = z.enum([
  "spam",
  "harassment",
  "fraud",
  "inappropriate",
  "other",
]);

const conversationIdsSchema = z
  .array(z.string().trim().min(1))
  .min(1)
  .max(100)
  .transform((ids) => [...new Set(ids)]);

export const bulkConversationActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.enum(["delete", "block", "unblock"]),
      conversationIds: conversationIdsSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("report"),
      conversationIds: conversationIdsSchema,
      reason: reportReasonSchema,
      notes: z.string().trim().max(500).optional(),
    })
    .strict(),
]);

export type BulkConversationAction = z.infer<
  typeof bulkConversationActionSchema
>;

export function reportReasonLabel(reason: ContactReportReason): string {
  return {
    spam: "Spam",
    harassment: "Acoso",
    fraud: "Fraude",
    inappropriate: "Contenido inapropiado",
    other: "Otro",
  }[reason];
}

export class ModerationError extends Error {
  code: "not_found" | "invalid" | "meta_unavailable";

  constructor(code: ModerationError["code"], message: string) {
    super(message);
    this.name = "ModerationError";
    this.code = code;
  }
}

type RealConversation = {
  conversationId: string;
  contactId: string;
  phone: string;
  isTest: boolean;
};

async function loadConversations(
  organizationId: string,
  conversationIds: string[]
): Promise<RealConversation[]> {
  const rows = await getDb()
    .select({
      conversationId: schema.conversation.id,
      contactId: schema.contact.id,
      phone: schema.contact.phone,
      isTest: schema.conversation.isTest,
    })
    .from(schema.conversation)
    .innerJoin(
      schema.contact,
      and(
        eq(schema.conversation.contactId, schema.contact.id),
        eq(schema.contact.organizationId, organizationId)
      )
    )
    .where(
      scoped(
        schema.conversation.organizationId,
        organizationId,
        inArray(schema.conversation.id, conversationIds)
      )
    );

  if (rows.length === 0) {
    throw new ModerationError("not_found", "Conversación no encontrada");
  }
  if (rows.some((row) => row.isTest)) {
    throw new ModerationError(
      "invalid",
      "Las conversaciones de prueba no admiten esta acción"
    );
  }
  return rows;
}

function publishChanges(organizationId: string, conversationIds: string[]) {
  for (const id of conversationIds) {
    publish(organizationId, {
      type: "conversation.updated",
      data: { conversation: { id } },
    });
  }
}

export async function deleteConversations(
  organizationId: string,
  conversationIds: string[]
): Promise<{ affected: number; ids: string[] }> {
  const rows = await loadConversations(organizationId, conversationIds);
  const ids = rows.map((row) => row.conversationId);
  const deleted = await getDb()
    .delete(schema.conversation)
    .where(
      scoped(
        schema.conversation.organizationId,
        organizationId,
        inArray(schema.conversation.id, ids),
        eq(schema.conversation.isTest, false)
      )
    )
    .returning({ id: schema.conversation.id });

  publishChanges(
    organizationId,
    deleted.map((row) => row.id)
  );
  return { affected: deleted.length, ids: deleted.map((row) => row.id) };
}

function uniqueContacts(rows: RealConversation[]) {
  return [
    ...new Map(
      rows.map((row) => [
        row.contactId,
        { id: row.contactId, phone: row.phone },
      ])
    ).values(),
  ];
}

function syncFailureMessage(error: unknown): string {
  if (error instanceof BlockedUsersError) return error.message.slice(0, 500);
  return "No se pudo sincronizar el bloqueo con Meta";
}

export async function setConversationsBlocked(input: {
  organizationId: string;
  userId: string;
  conversationIds: string[];
  blocked: boolean;
}): Promise<{
  affected: number;
  metaSynced: boolean;
  warning?: string;
}> {
  const rows = await loadConversations(
    input.organizationId,
    input.conversationIds
  );
  const contacts = uniqueContacts(rows);
  const contactIds = contacts.map((contact) => contact.id);
  const phones = contacts.map((contact) => contact.phone);
  const db = getDb();

  if (input.blocked) {
    await db
      .update(schema.contact)
      .set({
        blockedAt: new Date(),
        blockedByUserId: input.userId,
        blockSyncStatus: "failed",
        blockSyncError: "Pendiente de sincronización con Meta",
        updatedAt: new Date(),
      })
      .where(
        scoped(
          schema.contact.organizationId,
          input.organizationId,
          inArray(schema.contact.id, contactIds)
        )
      );

    try {
      await blockWhatsAppUsers(input.organizationId, phones);
      await db
        .update(schema.contact)
        .set({
          blockSyncStatus: "synced",
          blockSyncError: null,
          updatedAt: new Date(),
        })
        .where(
          scoped(
            schema.contact.organizationId,
            input.organizationId,
            inArray(schema.contact.id, contactIds)
          )
        );
      publishChanges(
        input.organizationId,
        rows.map((row) => row.conversationId)
      );
      return { affected: contacts.length, metaSynced: true };
    } catch (error) {
      await db
        .update(schema.contact)
        .set({
          blockSyncStatus: "failed",
          blockSyncError: syncFailureMessage(error),
          updatedAt: new Date(),
        })
        .where(
          scoped(
            schema.contact.organizationId,
            input.organizationId,
            inArray(schema.contact.id, contactIds)
          )
        );
      publishChanges(
        input.organizationId,
        rows.map((row) => row.conversationId)
      );
      return {
        affected: contacts.length,
        metaSynced: false,
        warning:
          "El bloqueo ya protege el CRM, pero falta sincronizarlo con Meta.",
      };
    }
  }

  try {
    await unblockWhatsAppUsers(input.organizationId, phones);
  } catch (error) {
    throw new ModerationError(
      "meta_unavailable",
      error instanceof BlockedUsersError
        ? `${error.message}. El contacto sigue bloqueado.`
        : "No se pudo desbloquear en Meta. El contacto sigue bloqueado."
    );
  }

  await db
    .update(schema.contact)
    .set({
      blockedAt: null,
      blockedByUserId: null,
      blockSyncStatus: null,
      blockSyncError: null,
      updatedAt: new Date(),
    })
    .where(
      scoped(
        schema.contact.organizationId,
        input.organizationId,
        inArray(schema.contact.id, contactIds)
      )
    );
  publishChanges(
    input.organizationId,
    rows.map((row) => row.conversationId)
  );
  return { affected: contacts.length, metaSynced: true };
}

export async function reportConversations(input: {
  organizationId: string;
  userId: string;
  conversationIds: string[];
  reason: ContactReportReason;
  notes?: string;
}): Promise<{ affected: number }> {
  const rows = await loadConversations(
    input.organizationId,
    input.conversationIds
  );
  await getDb()
    .insert(schema.contactReport)
    .values(
      rows.map((row) => ({
        id: newId("contactReport"),
        organizationId: input.organizationId,
        contactId: row.contactId,
        conversationId: row.conversationId,
        reason: input.reason,
        notes: input.notes?.trim() || null,
        reportedByUserId: input.userId,
      }))
    );
  publishChanges(
    input.organizationId,
    rows.map((row) => row.conversationId)
  );
  return { affected: rows.length };
}
