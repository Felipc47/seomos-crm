import { z } from "zod";

export const WEB_FORM_MAX_BODY_BYTES = 32 * 1024;

export class WebFormRequestError extends Error {
  constructor(
    public readonly status: 413 | 415 | 422,
    public readonly code:
      | "body_too_large"
      | "unsupported_media_type"
      | "invalid_submission",
    message: string
  ) {
    super(message);
    this.name = "WebFormRequestError";
  }
}

function cleanOptional(value: unknown): unknown {
  return typeof value === "string" && value.trim() === ""
    ? undefined
    : value;
}

function consentValue(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "on", "si", "sí", "accepted"].includes(
    value.trim().toLowerCase()
  );
}

export function normalizeWebFormPhone(value: string): string | null {
  const withoutLink = value.trim().replace(/^https?:\/\/(?:api\.)?wa\.me\//i, "");
  const digits = withoutLink.replace(/\D/g, "").replace(/^00/, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

const submissionSchema = z
  .object({
    externalId: z.string().trim().min(1).max(128),
    phone: z.string().trim().min(1).max(40),
    name: z.preprocess(cleanOptional, z.string().trim().max(120).optional()),
    email: z.preprocess(
      cleanOptional,
      z.string().trim().email().max(254).optional()
    ),
    message: z.preprocess(
      cleanOptional,
      z.string().trim().max(4000).optional()
    ),
    source: z.preprocess(
      cleanOptional,
      z.string().trim().max(120).optional()
    ),
    campaign: z.preprocess(
      cleanOptional,
      z.string().trim().max(200).optional()
    ),
    pageUrl: z.preprocess(
      cleanOptional,
      z.string().trim().url().max(2048).optional()
    ),
    consent: z.unknown().optional().transform(consentValue),
  })
  .transform((value, ctx) => {
    const phone = normalizeWebFormPhone(value.phone);
    if (!phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "debe ser un número internacional de 8 a 15 dígitos",
      });
      return z.NEVER;
    }
    return { ...value, phone };
  });

export type WebFormSubmissionInput = z.infer<typeof submissionSchema>;

const ALIASES: Record<string, string[]> = {
  externalId: ["externalId", "external_id", "submission_id"],
  phone: ["phone", "your_phone", "your-phone"],
  name: ["name", "full_name", "your_name", "your-name"],
  email: ["email", "your_email", "your-email"],
  message: ["message", "your_message", "your-message"],
  source: ["source"],
  campaign: ["campaign", "utm_campaign"],
  pageUrl: ["pageUrl", "page_url"],
  consent: ["consent", "acceptance"],
};

function firstAlias(
  input: Record<string, unknown>,
  aliases: string[]
): unknown {
  for (const alias of aliases) {
    if (input[alias] !== undefined) return input[alias];
  }
  return undefined;
}

export function canonicalizeWebFormFields(
  input: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(ALIASES).map(([canonical, aliases]) => [
      canonical,
      firstAlias(input, aliases),
    ])
  );
}

export function parseWebFormSubmission(
  input: Record<string, unknown>
): WebFormSubmissionInput {
  const parsed = submissionSchema.safeParse(canonicalizeWebFormFields(input));
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path[0] ?? "body")),
    ];
    throw new WebFormRequestError(
      422,
      "invalid_submission",
      `Campos inválidos: ${fields.join(", ")}`
    );
  }
  return parsed.data;
}

async function readLimitedBody(req: Request): Promise<string> {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > WEB_FORM_MAX_BODY_BYTES) {
    throw new WebFormRequestError(
      413,
      "body_too_large",
      "El formulario supera 32 KiB"
    );
  }
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > WEB_FORM_MAX_BODY_BYTES) {
      await reader.cancel();
      throw new WebFormRequestError(
        413,
        "body_too_large",
        "El formulario supera 32 KiB"
      );
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function parseWebFormRequest(
  req: Request
): Promise<WebFormSubmissionInput> {
  const type = (req.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (
    type !== "application/json" &&
    type !== "application/x-www-form-urlencoded"
  ) {
    throw new WebFormRequestError(
      415,
      "unsupported_media_type",
      "Usa application/json o application/x-www-form-urlencoded"
    );
  }
  const text = await readLimitedBody(req);
  let raw: Record<string, unknown>;
  try {
    if (type === "application/json") {
      const value: unknown = JSON.parse(text);
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("shape");
      }
      raw = value as Record<string, unknown>;
    } else {
      raw = Object.fromEntries(new URLSearchParams(text).entries());
    }
  } catch {
    throw new WebFormRequestError(
      422,
      "invalid_submission",
      "El cuerpo del formulario no tiene un formato válido"
    );
  }
  return parseWebFormSubmission(raw);
}
