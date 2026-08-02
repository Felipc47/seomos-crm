import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import type {
  ConversationDto,
  InboxAssigneeOptionDto,
} from "@/lib/types";
import { publish } from "@/server/events/bus";
import { notifyUser } from "@/server/notifications";
import { onLeadActivity } from "@/server/inbox/lead-activity";
import {
  getConversation,
  serializeConversation,
} from "@/server/inbox/queries";

export const transferAssigneeSchema = z
  .object({
    memberId: z.string().trim().min(1).nullable(),
  })
  .strict();

export class InboxAssignmentError extends Error {
  constructor(
    public readonly code:
      | "not_found"
      | "invalid_assignee"
      | "assignment_unavailable"
      | "membership_not_found",
    message: string
  ) {
    super(message);
    this.name = "InboxAssignmentError";
  }
}

export function isSameAssignment(
  currentMemberId: string | null,
  nextMemberId: string | null
): boolean {
  return currentMemberId === nextMemberId;
}

type NotificationWriter = typeof notifyUser;

export async function deliverTransferNotification(
  input: {
    changed: boolean;
    targetUserId: string | null;
    actorUserId: string;
    organizationId: string;
    contactId: string;
    contactName: string;
  },
  write: NotificationWriter = notifyUser
): Promise<boolean> {
  if (
    !input.changed ||
    !input.targetUserId ||
    input.targetUserId === input.actorUserId
  ) {
    return false;
  }

  try {
    await write({
      userId: input.targetUserId,
      organizationId: input.organizationId,
      type: "conversation_assigned",
      title: "Chat transferido",
      body: `${input.contactName} ahora está asignado a ti.`,
      href: `/inbox?contact=${input.contactId}`,
    });
    return true;
  } catch {
    // La asignación es el dato primario: una alerta secundaria nunca la revierte.
    return false;
  }
}

export async function listAssignmentOptions(
  organizationId: string,
  userId: string
): Promise<{
  currentMemberId: string;
  members: InboxAssigneeOptionDto[];
}> {
  const db = getDb();
  const rows = await db
    .select({
      memberId: schema.member.id,
      userId: schema.member.userId,
      name: schema.user.name,
      role: schema.member.role,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(scoped(schema.member.organizationId, organizationId))
    .orderBy(asc(schema.user.name));

  const current = rows.find((row) => row.userId === userId);
  if (!current) {
    throw new InboxAssignmentError(
      "membership_not_found",
      "La sesión ya no pertenece al equipo"
    );
  }

  return {
    currentMemberId: current.memberId,
    members: rows.map((row) => ({
      memberId: row.memberId,
      name: row.name,
      role: row.role,
      isCurrent: row.memberId === current.memberId,
    })),
  };
}

function serializeRow(
  row: NonNullable<Awaited<ReturnType<typeof getConversation>>>
): ConversationDto {
  return serializeConversation(
    row.conversation,
    row.contact,
    null,
    row.stageName,
    {
      service:
        row.serviceId && row.serviceName
          ? { id: row.serviceId, name: row.serviceName }
          : null,
      assignee:
        row.assigneeMemberId && row.assigneeName
          ? { memberId: row.assigneeMemberId, name: row.assigneeName }
          : null,
    },
    { reportedAt: row.reportedAt, reportReason: row.reportReason }
  );
}

export async function transferConversationAssignee(input: {
  organizationId: string;
  actorUserId: string;
  conversationId: string;
  memberId: string | null;
}): Promise<{ changed: boolean; conversation: ConversationDto }> {
  const db = getDb();
  const contextRows = await db
    .select({
      conversation: schema.conversation,
      contact: schema.contact,
      leadId: schema.lead.id,
      currentMemberId: schema.lead.assignedMemberId,
    })
    .from(schema.conversation)
    .innerJoin(
      schema.contact,
      and(
        eq(schema.contact.id, schema.conversation.contactId),
        eq(schema.contact.organizationId, input.organizationId)
      )
    )
    .leftJoin(
      schema.lead,
      and(
        eq(schema.lead.contactId, schema.contact.id),
        eq(schema.lead.organizationId, input.organizationId)
      )
    )
    .where(
      scoped(
        schema.conversation.organizationId,
        input.organizationId,
        eq(schema.conversation.id, input.conversationId),
        eq(schema.conversation.isTest, false)
      )
    )
    .limit(1);
  const context = contextRows[0];
  if (!context) {
    throw new InboxAssignmentError("not_found", "Conversación no encontrada");
  }

  let target:
    | { memberId: string; userId: string; name: string; role: string }
    | undefined;
  if (input.memberId) {
    const targetRows = await db
      .select({
        memberId: schema.member.id,
        userId: schema.member.userId,
        name: schema.user.name,
        role: schema.member.role,
      })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
      .where(
        scoped(
          schema.member.organizationId,
          input.organizationId,
          eq(schema.member.id, input.memberId)
        )
      )
      .limit(1);
    target = targetRows[0];
    if (!target) {
      throw new InboxAssignmentError(
        "invalid_assignee",
        "El responsable seleccionado no pertenece a este equipo"
      );
    }
  }

  let leadId = context.leadId;
  if (!leadId) {
    leadId = await onLeadActivity(
      input.organizationId,
      context.contact.id,
      context.conversation.lastMessageAt ?? context.conversation.createdAt
    );
    if (!leadId) {
      throw new InboxAssignmentError(
        "assignment_unavailable",
        "No hay una etapa abierta para crear el prospecto"
      );
    }
  }

  const changed = !isSameAssignment(
    context.currentMemberId,
    input.memberId
  );
  if (changed) {
    const updated = await db
      .update(schema.lead)
      .set({ assignedMemberId: input.memberId, updatedAt: new Date() })
      .where(
        scoped(
          schema.lead.organizationId,
          input.organizationId,
          eq(schema.lead.id, leadId)
        )
      )
      .returning({ id: schema.lead.id });
    if (!updated[0]) {
      throw new InboxAssignmentError("not_found", "Prospecto no encontrado");
    }
  }

  const refreshed = await getConversation(
    input.organizationId,
    input.conversationId
  );
  if (!refreshed) {
    throw new InboxAssignmentError("not_found", "Conversación no encontrada");
  }
  const conversation = serializeRow(refreshed);

  if (changed) {
    publish(input.organizationId, {
      type: "conversation.updated",
      data: { conversation },
    });
    await deliverTransferNotification({
      changed,
      targetUserId: target?.userId ?? null,
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      contactId: context.contact.id,
      contactName: context.contact.name,
    });
  }

  return { changed, conversation };
}
