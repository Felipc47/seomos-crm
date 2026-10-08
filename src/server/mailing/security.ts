import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
export function unsubscribeToken(org: string, subscriber: string, nonce: string) {
    const payload = Buffer.from(JSON.stringify([org, subscriber, nonce])).toString("base64url");
    return `${payload}.${createHmac("sha256", getEnv().BETTER_AUTH_SECRET).update(`mailing-unsubscribe:${payload}`).digest("base64url")}`;
}
export function readUnsubscribeToken(token: string): [
    string,
    string,
    string
] | null {
    if (token.length > 1000)
        return null;
    const [payload, signature] = token.split(".");
    if (!payload || !signature)
        return null;
    const expected = createHmac("sha256", getEnv().BETTER_AUTH_SECRET).update(`mailing-unsubscribe:${payload}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
        return null;
    try {
        const parts: unknown = JSON.parse(Buffer.from(payload, "base64url").toString());
        return Array.isArray(parts) && parts.length === 3 && parts.every((p) => typeof p === "string" && p.length > 0) ? parts as [
            string,
            string,
            string
        ] : null;
    }
    catch {
        return null;
    }
}
export function verifyMailingWebhook(raw: string, headers: Headers, secret: string, now = Date.now()) {
    const id = headers.get("svix-id");
    const timestamp = headers.get("svix-timestamp");
    const signatures = headers.get("svix-signature");
    if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300 || !secret.startsWith("whsec_"))
        return false;
    const key = Buffer.from(secret.slice(6), "base64");
    if (key.length < 16)
        return false;
    const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${raw}`).digest();
    return signatures.split(" ").some((s) => { const [version, value] = s.split(","); if (version !== "v1" || !value)
        return false; const actual = Buffer.from(value, "base64"); return actual.length === expected.length && timingSafeEqual(actual, expected); });
}
