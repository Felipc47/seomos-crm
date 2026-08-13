import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export type WebFormSecretColumns = {
  secretCipher: string;
  secretIv: string;
  secretTag: string;
  secretLast4: string;
};

export function generateWebFormSecret(): {
  secret: string;
  encrypted: WebFormSecretColumns;
} {
  const secret = `wf_${randomBytes(32).toString("base64url")}`;
  const value = encryptSecret(secret);
  return {
    secret,
    encrypted: {
      secretCipher: value.cipher,
      secretIv: value.iv,
      secretTag: value.tag,
      secretLast4: secret.slice(-4),
    },
  };
}

export function decryptWebFormSecret(value: WebFormSecretColumns): string {
  return decryptSecret({
    cipher: value.secretCipher,
    iv: value.secretIv,
    tag: value.secretTag,
  });
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function webFormSecretMatches(
  candidate: string,
  stored: WebFormSecretColumns
): boolean {
  try {
    return timingSafeEqual(
      digest(candidate),
      digest(decryptWebFormSecret(stored))
    );
  } catch {
    return false;
  }
}

export function bearerSecret(req: Request): string | null {
  const value = req.headers.get("authorization");
  const match = value?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}
