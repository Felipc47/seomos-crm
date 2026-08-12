import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { isEmailConfigured } from "@/lib/env";
import { ResendError, sendResendEmail } from "@/lib/resend/client";

export type EmailDeliveryResult =
  | { status: "sent" }
  | { status: "failed" }
  | { status: "deduplicated" }
  | { status: "unconfigured" };

export async function deliverEmail(input: {
  organizationId: string;
  recipientUserId: string;
  kind: "new_lead" | "weekly_assignee" | "weekly_admin";
  leadId?: string;
  periodStart?: Date;
  idempotencyKey: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailDeliveryResult> {
  if (!isEmailConfigured()) return { status: "unconfigured" };

  const db = getDb();
  const reserved = await db
    .insert(schema.emailDelivery)
    .values({
      id: newId("emailDelivery"),
      organizationId: input.organizationId,
      recipientUserId: input.recipientUserId,
      kind: input.kind,
      leadId: input.leadId ?? null,
      periodStart: input.periodStart ?? null,
      idempotencyKey: input.idempotencyKey,
      status: "pending",
    })
    .onConflictDoNothing({ target: [schema.emailDelivery.idempotencyKey] })
    .returning({ id: schema.emailDelivery.id });
  const row = reserved[0];
  if (!row) return { status: "deduplicated" };

  try {
    const sent = await sendResendEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      idempotencyKey: input.idempotencyKey,
    });
    const now = new Date();
    await db
      .update(schema.emailDelivery)
      .set({
        status: "sent",
        providerMessageId: sent.id,
        lastError: null,
        sentAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.emailDelivery.organizationId, input.organizationId),
          eq(schema.emailDelivery.id, row.id)
        )
      );
    return { status: "sent" };
  } catch (error) {
    const safeMessage =
      error instanceof ResendError
        ? error.safeMessage
        : "Fallo inesperado al enviar correo";
    await db
      .update(schema.emailDelivery)
      .set({ status: "failed", lastError: safeMessage, updatedAt: new Date() })
      .where(
        and(
          eq(schema.emailDelivery.organizationId, input.organizationId),
          eq(schema.emailDelivery.id, row.id)
        )
      );
    console.error(
      `[email] entrega ${input.kind} falló en ${input.organizationId}: ${safeMessage}`
    );
    return { status: "failed" };
  }
}
