import {
  graphRequest,
  MetaApiError,
  normalizeRecipient,
} from "@/lib/meta/client";
import {
  getCredentialsByOrg,
  markReconnectRequired,
} from "@/server/whatsapp/credentials";

export class BlockedUsersError extends Error {
  code:
    | "not_connected"
    | "reconnect_required"
    | "meta_error"
    | "meta_unavailable";

  constructor(code: BlockedUsersError["code"], message: string) {
    super(message);
    this.name = "BlockedUsersError";
    this.code = code;
  }
}

function normalizeBlockedUser(phone: string): string {
  return normalizeRecipient(phone.replace(/\D/g, ""));
}

/** Payload documentado por Meta para POST/DELETE `block_users`. */
export function buildBlockUsersBody(phones: string[]) {
  return {
    messaging_product: "whatsapp" as const,
    block_users: phones.map((phone) => ({ user: normalizeBlockedUser(phone) })),
  };
}

async function syncBlockedUsers(
  organizationId: string,
  phones: string[],
  method: "POST" | "DELETE"
): Promise<void> {
  const credentials = await getCredentialsByOrg(organizationId);
  if (!credentials) {
    throw new BlockedUsersError(
      "not_connected",
      "No hay un número de WhatsApp conectado"
    );
  }
  if (credentials.status === "reconnect_required") {
    throw new BlockedUsersError(
      "reconnect_required",
      "El número de WhatsApp necesita reconexión"
    );
  }

  try {
    await graphRequest(`${credentials.phoneNumberId}/block_users`, {
      method,
      token: credentials.token,
      body: buildBlockUsersBody(phones),
    });
  } catch (error) {
    if (error instanceof MetaApiError) {
      if (error.isAuthError) {
        await markReconnectRequired(organizationId);
        throw new BlockedUsersError(
          "reconnect_required",
          "El número de WhatsApp necesita reconexión"
        );
      }
      if (error.status === 0 || error.status >= 500) {
        throw new BlockedUsersError(
          "meta_unavailable",
          "Meta no está disponible en este momento"
        );
      }
      throw new BlockedUsersError(
        "meta_error",
        "Meta rechazó la sincronización del bloqueo"
      );
    }
    throw error;
  }
}

export async function blockWhatsAppUsers(
  organizationId: string,
  phones: string[]
): Promise<void> {
  await syncBlockedUsers(organizationId, phones, "POST");
}

export async function unblockWhatsAppUsers(
  organizationId: string,
  phones: string[]
): Promise<void> {
  await syncBlockedUsers(organizationId, phones, "DELETE");
}
