import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isOrgAdmin, type Role } from "@/lib/permissions";
import type { SessionContext } from "@/lib/auth/session";

/** ¿La organización tiene entre sus miembros a un superadmin? (La empresa
 * del superadmin no tiene tope de equipo; el resto, TEAM_LIMIT.) */
export async function hasUnlimitedTeam(
  organizationId: string
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.member.id })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(
      and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.user.isSuperadmin, true)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export class TeamMutationError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type TeamChange = {
  name?: string;
  email?: string;
  role?: Role;
};

/** La organización se bloquea antes de validar para proteger al último admin
 * incluso ante dos ediciones/eliminaciones concurrentes desde distintas rutas. */
export async function mutateTeamMember(input: {
  actor: SessionContext;
  organizationId: string;
  memberId: string;
  change?: TeamChange;
  remove?: boolean;
  asSuperadmin?: boolean;
}): Promise<{ signInAgain: boolean }> {
  const { actor, organizationId, memberId, change = {} } = input;
  try {
    return await getDb().transaction(async (tx) => {
      await tx.select({ id: schema.organization.id }).from(schema.organization)
        .where(eq(schema.organization.id, organizationId)).for("update");

      if (input.asSuperadmin) {
        if (!actor.isSuperadmin) throw new TeamMutationError(403, "forbidden", "Solo el superadmin administra empresas");
      } else {
        const [current] = await tx.select({ role: schema.member.role }).from(schema.member)
          .where(scoped(schema.member.organizationId, organizationId, eq(schema.member.userId, actor.userId)));
        if (organizationId !== actor.organizationId || !current || !isOrgAdmin(current.role)) {
          throw new TeamMutationError(403, "forbidden", "Solo el admin puede modificar el equipo");
        }
      }

      const [target] = await tx.select({
        userId: schema.member.userId, role: schema.member.role,
        name: schema.user.name, email: schema.user.email, isSuperadmin: schema.user.isSuperadmin,
      }).from(schema.member).innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
        .where(scoped(schema.member.organizationId, organizationId, eq(schema.member.id, memberId)))
        .for("update");
      if (!target) throw new TeamMutationError(404, "not_found", "Miembro no encontrado");
      if (input.remove && target.userId === actor.userId) {
        throw new TeamMutationError(422, "self_removal", "No puedes eliminarte a ti mismo del equipo");
      }
      if (target.isSuperadmin && (input.remove || (change.role !== undefined && !isOrgAdmin(change.role)) || target.userId !== actor.userId)) {
        throw new TeamMutationError(403, "protected_member", "La cuenta del superadmin está protegida");
      }
      if (isOrgAdmin(target.role) && (input.remove || (change.role !== undefined && !isOrgAdmin(change.role)))) {
        const [other] = await tx.select({ id: schema.member.id }).from(schema.member)
          .where(scoped(schema.member.organizationId, organizationId,
            inArray(schema.member.role, ["owner", "admin"]), ne(schema.member.id, memberId))).limit(1);
        if (!other) throw new TeamMutationError(422, "last_admin", "La empresa no puede quedarse sin admin");
      }

      const nameChanged = change.name !== undefined && change.name !== target.name;
      const emailChanged = change.email !== undefined && change.email !== target.email;
      if (nameChanged || emailChanged) {
        // user es una identidad global; un admin local no puede cambiar otras empresas.
        const [shared] = await tx.select({ id: schema.member.id }).from(schema.member)
          .where(and(eq(schema.member.userId, target.userId), ne(schema.member.organizationId, organizationId))).limit(1);
        if (shared) throw new TeamMutationError(409, "shared_account", "Esta cuenta pertenece a varias empresas. Aquí solo puedes modificar su rol");
        await tx.update(schema.user).set({
          ...(nameChanged ? { name: change.name } : {}),
          ...(emailChanged ? { email: change.email, emailVerified: false } : {}),
          updatedAt: new Date(),
        }).where(eq(schema.user.id, target.userId));
      }

      if (input.remove) {
        await tx.update(schema.service).set({ assignedMemberId: null, updatedAt: new Date() })
          .where(scoped(schema.service.organizationId, organizationId, eq(schema.service.assignedMemberId, memberId)));
        await tx.update(schema.lead).set({ assignedMemberId: null, updatedAt: new Date() })
          .where(scoped(schema.lead.organizationId, organizationId, eq(schema.lead.assignedMemberId, memberId)));
        await tx.delete(schema.member)
          .where(scoped(schema.member.organizationId, organizationId, eq(schema.member.id, memberId)));
        await tx.delete(schema.session).where(and(eq(schema.session.userId, target.userId), eq(schema.session.activeOrganizationId, organizationId)));
      } else if (change.role !== undefined) {
        await tx.update(schema.member).set({ role: change.role })
          .where(scoped(schema.member.organizationId, organizationId, eq(schema.member.id, memberId)));
      }
      if (emailChanged) {
        await tx.delete(schema.session).where(eq(schema.session.userId, target.userId));
      }
      return { signInAgain: emailChanged && target.userId === actor.userId };
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new TeamMutationError(409, "duplicate", "Ya existe una cuenta con ese correo");
    }
    throw error;
  }
}
