import type { LookupAddress } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

const MAX_REDIRECTS = 4;
const MAX_RESPONSE_BYTES = 200_000;
const MAX_TEXT_CHARS = 12_000;
const REQUEST_TIMEOUT_MS = 10_000;

export type WebsiteReadErrorCode =
  | "invalid_url"
  | "unsafe_url"
  | "unavailable"
  | "too_large"
  | "unsupported_content"
  | "timeout";

export class WebsiteReadError extends Error {
  constructor(
    public readonly code: WebsiteReadErrorCode,
    message: string
  ) {
    super(message);
    this.name = "WebsiteReadError";
  }
}

export type ResolvedAddress = { address: string; family: 4 | 6 };

export type WebsiteTransportResponse = {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: string;
};

export type WebsiteReaderDependencies = {
  resolve: (hostname: string) => Promise<ResolvedAddress[]>;
  request: (
    url: URL,
    addresses: ResolvedAddress[]
  ) => Promise<WebsiteTransportResponse>;
};

export type WebsiteContext = {
  url: string;
  title: string | null;
  description: string | null;
  text: string;
};

// Node representa internamente IPv4 como IPv6-mapped al consultar una lista
// mixta; listas separadas evitan que ::ffff:0:0/96 bloquee TODO IPv4 público.
const blockedIpv4 = new BlockList();
const blockedIpv6 = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedIpv4.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001:2::", 48],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedIpv6.addSubnet(network, prefix, "ipv6");
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blockedIpv4.check(address, "ipv4");
  if (family === 6) return !blockedIpv6.check(address, "ipv6");
  return false;
}

export function normalizeWebsiteUrl(raw: string): URL {
  const value = raw.trim();
  if (!value) {
    throw new WebsiteReadError("invalid_url", "Escribe una URL válida");
  }

  let parsed: URL;
  try {
    parsed = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    throw new WebsiteReadError(
      "invalid_url",
      "No reconocimos esa dirección. Prueba con ejemplo.com"
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new WebsiteReadError(
      "invalid_url",
      "El sitio debe usar una dirección http o https"
    );
  }
  if (parsed.username || parsed.password) {
    throw new WebsiteReadError(
      "unsafe_url",
      "Por seguridad, la URL no puede incluir usuario ni contraseña"
    );
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  const privateName =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home") ||
    hostname.endsWith(".lan");
  if (!hostname || privateName || (isIP(hostname) === 0 && !hostname.includes("."))) {
    throw new WebsiteReadError(
      "unsafe_url",
      "Por seguridad, usa un sitio público y no una dirección interna"
    );
  }
  if (isIP(hostname) > 0 && !isPublicAddress(hostname)) {
    throw new WebsiteReadError(
      "unsafe_url",
      "Por seguridad, no podemos consultar direcciones privadas o locales"
    );
  }

  const allowedPort =
    !parsed.port ||
    (parsed.protocol === "http:" && parsed.port === "80") ||
    (parsed.protocol === "https:" && parsed.port === "443");
  if (!allowedPort) {
    throw new WebsiteReadError(
      "unsafe_url",
      "Por seguridad, el sitio debe usar el puerto web estándar"
    );
  }

  parsed.hash = "";
  return parsed;
}

async function resolvePublicAddresses(hostname: string): Promise<ResolvedAddress[]> {
  if (isIP(hostname) > 0) {
    const family = isIP(hostname) as 4 | 6;
    return [{ address: hostname, family }];
  }

  let rows: LookupAddress[];
  try {
    rows = await dnsLookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new WebsiteReadError(
      "unavailable",
      "No pudimos encontrar ese sitio. Revisa la dirección e intenta de nuevo"
    );
  }
  const addresses = rows.map((row) => ({
    address: row.address,
    family: row.family as 4 | 6,
  }));
  if (addresses.length === 0) {
    throw new WebsiteReadError("unavailable", "El sitio no devolvió una dirección pública");
  }
  if (addresses.some((row) => !isPublicAddress(row.address))) {
    throw new WebsiteReadError(
      "unsafe_url",
      "Por seguridad, el sitio resuelve a una red privada o local"
    );
  }
  return addresses;
}

function pinnedLookup(addresses: ResolvedAddress[]): LookupFunction {
  return (_hostname, options, callback) => {
    const requestedFamily =
      options.family === "IPv4" ? 4 : options.family === "IPv6" ? 6 : options.family ?? 0;
    const candidates = addresses.filter(
      (row) => requestedFamily === 0 || row.family === requestedFamily
    );
    if (candidates.length === 0) {
      const error = new Error("No hay una dirección pública compatible") as NodeJS.ErrnoException;
      error.code = "ENOTFOUND";
      callback(error, "");
      return;
    }
    if (options.all) {
      callback(null, candidates);
      return;
    }
    const first = candidates[0]!;
    callback(null, first.address, first.family);
  };
}

async function requestPinnedUrl(
  url: URL,
  addresses: ResolvedAddress[]
): Promise<WebsiteTransportResponse> {
  return new Promise((resolve, reject) => {
    const requester = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = requester(
      url,
      {
        method: "GET",
        lookup: pinnedLookup(addresses),
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.8",
          "Accept-Encoding": "identity",
          "User-Agent": "Seomos-CRM-Setup-Assistant/1.0",
        },
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;
        const location = res.headers.location;
        if (statusCode >= 300 && statusCode < 400 && location) {
          res.resume();
          resolve({ statusCode, headers: res.headers, body: "" });
          return;
        }
        if (statusCode < 200 || statusCode >= 300) {
          res.resume();
          reject(
            new WebsiteReadError(
              "unavailable",
              `El sitio respondió con estado ${statusCode || "desconocido"}`
            )
          );
          return;
        }

        const contentType = String(res.headers["content-type"] ?? "").toLowerCase();
        if (
          !contentType.includes("text/html") &&
          !contentType.includes("application/xhtml+xml") &&
          !contentType.includes("text/plain")
        ) {
          res.resume();
          reject(
            new WebsiteReadError(
              "unsupported_content",
              "La dirección no corresponde a una página de texto"
            )
          );
          return;
        }

        const declaredLength = Number(res.headers["content-length"] ?? 0);
        if (declaredLength > MAX_RESPONSE_BYTES) {
          res.resume();
          reject(
            new WebsiteReadError(
              "too_large",
              "La página es demasiado grande para analizarla de forma segura"
            )
          );
          return;
        }

        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          bytes += buffer.length;
          if (bytes > MAX_RESPONSE_BYTES) {
            res.destroy(
              new WebsiteReadError(
                "too_large",
                "La página es demasiado grande para analizarla de forma segura"
              )
            );
            return;
          }
          chunks.push(buffer);
        });
        res.on("end", () => {
          resolve({
            statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
        res.on("error", reject);
      }
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(
        new WebsiteReadError(
          "timeout",
          "El sitio tardó demasiado en responder. Puedes continuar describiendo el negocio"
        )
      );
    });
    req.on("error", (error) => {
      if (error instanceof WebsiteReadError) {
        reject(error);
        return;
      }
      reject(
        new WebsiteReadError(
          "unavailable",
          "No pudimos leer el sitio. Revisa la dirección o describe el negocio"
        )
      );
    });
    req.end();
  });
}

const defaultDependencies: WebsiteReaderDependencies = {
  resolve: resolvePublicAddresses,
  request: requestPinnedUrl,
};

export async function readPublicWebsite(
  input: string,
  dependencies: WebsiteReaderDependencies = defaultDependencies
): Promise<WebsiteContext> {
  let current = normalizeWebsiteUrl(input);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const hostname = current.hostname.replace(/^\[|\]$/g, "");
    const addresses = await dependencies.resolve(hostname);
    if (
      addresses.length === 0 ||
      addresses.some((row) => row.family !== isIP(row.address) || !isPublicAddress(row.address))
    ) {
      throw new WebsiteReadError(
        "unsafe_url",
        "Por seguridad, el sitio resuelve a una red privada o local"
      );
    }

    const response = await dependencies.request(current, addresses);
    const location = response.headers.location;
    if (response.statusCode >= 300 && response.statusCode < 400 && location) {
      if (redirect === MAX_REDIRECTS) {
        throw new WebsiteReadError("unavailable", "El sitio redirige demasiadas veces");
      }
      current = normalizeWebsiteUrl(new URL(location, current).toString());
      continue;
    }

    const extracted = extractReadableWebsiteText(response.body);
    if (!extracted.text) {
      throw new WebsiteReadError(
        "unsupported_content",
        "No encontramos texto útil en esa página. Puedes describir el negocio"
      );
    }
    return { url: current.toString(), ...extracted };
  }

  throw new WebsiteReadError("unavailable", "No pudimos completar la lectura del sitio");
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    laquo: "«",
    lt: "<",
    nbsp: " ",
    quot: '"',
    raquo: "»",
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, key: string) => {
    if (key.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(key.slice(2), 16));
    }
    if (key.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(key.slice(1), 10));
    }
    return named[key.toLowerCase()] ?? entity;
  });
}

function plainText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metaDescription(html: string): string | null {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = /\b(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (name?.toLowerCase() !== "description" && name?.toLowerCase() !== "og:description") {
      continue;
    }
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (content) return plainText(content).slice(0, 500) || null;
  }
  return null;
}

export function extractReadableWebsiteText(html: string): {
  title: string | null;
  description: string | null;
  text: string;
} {
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  const title = plainText(titleMatch).slice(0, 300) || null;
  const description = metaDescription(html);
  const visible = html
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article)>/gi, " ");
  const text = plainText(visible).slice(0, MAX_TEXT_CHARS);
  return { title, description, text };
}
