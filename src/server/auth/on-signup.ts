import { and, count, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";

/** Embudo canónico: pocos estados comerciales, sin estados operativos. */
const SEED_STAGES: {
  name: string;
  kind: "open" | "scheduled" | "won" | "unqualified" | "lost";
}[] = [
  { name: "Nuevo", kind: "open" },
  { name: "En calificación", kind: "open" },
  { name: "Calificado", kind: "open" },
  // La alimenta el sistema al confirmarse una reunión (no se mueve a mano).
  { name: "Cita agendada", kind: "scheduled" },
  { name: "Cliente", kind: "won" },
  { name: "No calificado", kind: "unqualified" },
  { name: "No convertido", kind: "lost" },
];

/**
 * Primer registro de la instancia: crea la organización, deja al usuario como
 * propietario y siembra pipeline + perfil del agente.
 *
 * Solo actúa si NO existe ninguna organización (las cuentas de equipo las crea
 * el propietario y reciben su membresía explícita). Un advisory lock evita que
 * dos registros simultáneos en instancia vacía creen dos organizaciones.
 */
export async function onUserCreated(userId: string, userName: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    // Lock transaccional de "primer arranque" (clave arbitraria fija):
    // dos registros simultáneos en instancia vacía → solo uno crea la org.
    await tx.execute(sql`select pg_advisory_xact_lock(874201)`);
    const [orgs] = await tx
      .select({ n: count() })
      .from(schema.organization);
    if ((orgs?.n ?? 0) > 0) return;

    const orgId = newId("organization");
    await tx.insert(schema.organization).values({
      id: orgId,
      name: userName ? `Negocio de ${userName}` : "Mi negocio",
      slug: "principal",
    });
    await tx.insert(schema.member).values({
      id: newId("organization"),
      organizationId: orgId,
      userId,
      role: "owner",
    });
    await seedOrganizationDefaults(tx, orgId, { initialCredits: 1000 });
    // El fundador de la instancia es el superadmin: podrá crear más empresas.
    await tx
      .update(schema.user)
      .set({ isSuperadmin: true })
      .where(eq(schema.user.id, userId));
  });
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/** Siembra lo mínimo con lo que arranca toda empresa: pipeline, agente y saldo 0. */
export async function seedOrganizationDefaults(
  tx: Tx,
  organizationId: string,
  options: { initialCredits?: number } = {}
) {
  const initialCredits = options.initialCredits ?? 0;
  await tx.insert(schema.pipelineStage).values(
    SEED_STAGES.map((s, i) => ({
      id: newId("stage"),
      organizationId,
      name: s.name,
      position: i,
      kind: s.kind,
    }))
  );
  await tx.insert(schema.agentProfile).values({
    id: newId("agentProfile"),
    organizationId,
  });
  await tx
    .insert(schema.aiCreditAccount)
    .values({
      organizationId,
      balance: initialCredits,
      totalGranted: initialCredits,
    })
    .onConflictDoNothing();
  if (initialCredits > 0) {
    const entryId = newId("aiCreditEntry");
    await tx
      .insert(schema.aiCreditEntry)
      .values({
        id: entryId,
        organizationId,
        delta: initialCredits,
        kind: "initial_grant",
        referenceKey: "initial-grant:founder",
      })
      .onConflictDoNothing({
        target: [
          schema.aiCreditEntry.organizationId,
          schema.aiCreditEntry.referenceKey,
        ],
      });
  }
}

/** Organización activa de un usuario (su primera membresía). */
export async function resolveActiveOrganizationId(
  userId: string
): Promise<string | null> {
  return (await resolveMembership(userId))?.organizationId ?? null;
}

export async function resolveMembership(
  userId: string
): Promise<{
  organizationId: string;
  role: string;
  isSuperadmin: boolean;
} | null> {
  const db = getDb();
  const rows = await db
    .select({
      organizationId: schema.member.organizationId,
      role: schema.member.role,
      isSuperadmin: schema.user.isSuperadmin,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .innerJoin(
      schema.organization,
      eq(schema.member.organizationId, schema.organization.id)
    )
    // Empresa eliminada (respaldo 30 días): sus miembros quedan sin acceso.
    .where(
      and(
        eq(schema.member.userId, userId),
        isNull(schema.organization.deletedAt)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}
