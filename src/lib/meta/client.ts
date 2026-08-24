import { getEnv } from "@/lib/env";

/**
 * Cliente propio de la Graph API de Meta (WhatsApp Cloud API).
 * Única frontera de salida hacia Meta (Constitución II): todo request pasa
 * por graphRequest. En self-test, META_GRAPH_BASE_URL apunta al wa-mock.
 */

export class MetaApiError extends Error {
  status: number;
  code: number | null;
  type: string | null;
  details: unknown;

  constructor(
    message: string,
    opts: { status: number; code?: number | null; type?: string | null; details?: unknown }
  ) {
    super(message);
    this.name = "MetaApiError";
    this.status = opts.status;
    this.code = opts.code ?? null;
    this.type = opts.type ?? null;
    this.details = opts.details;
  }

  /** Token vencido/revocado → la conexión requiere re-autenticación. */
  get isAuthError(): boolean {
    // Meta usa `OAuthException` también para errores que NO invalidan el token
    // (por ejemplo parámetros faltantes, code 100). Solo 401 o code 190 son
    // evidencia suficiente para suspender la conexión y pedir reconexión.
    return this.status === 401 || this.code === 190;
  }
}

export async function graphRequest<T>(
  path: string,
  opts: {
    method?: "GET" | "POST" | "DELETE";
    token: string;
    body?: unknown;
  }
): Promise<T> {
  return graphFetch(path, {
    method: opts.method ?? "GET",
    token: opts.token,
    contentType: opts.body !== undefined ? "application/json" : null,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

/**
 * Subida multipart (adjuntos): `POST /{phone_number_id}/media`. FormData pone
 * su propio Content-Type con boundary — no se fija a mano.
 */
export async function graphUpload<T>(
  path: string,
  opts: { token: string; form: FormData }
): Promise<T> {
  return graphFetch(path, {
    method: "POST",
    token: opts.token,
    contentType: null,
    body: opts.form,
  });
}

/**
 * Resumable Upload API (encabezados de plantilla): abre la sesión de subida.
 * El `id` devuelto se usa como path del POST binario (graphUploadToSession).
 * `app/uploads` resuelve a la app dueña del token — no hace falta el app id.
 */
export async function graphCreateUploadSession(
  token: string,
  file: { length: number; type: string; name: string }
): Promise<string> {
  const query = new URLSearchParams({
    file_length: String(file.length),
    file_type: file.type,
    file_name: file.name,
  });
  const res = await graphRequest<{ id?: string }>(
    `app/uploads?${query.toString()}`,
    { method: "POST", token }
  );
  if (!res.id) {
    throw new MetaApiError("Meta no devolvió sesión de subida", { status: 502 });
  }
  return res.id;
}

/**
 * Sube el binario a la sesión y devuelve el `header_handle` (`h`) que exige
 * el componente HEADER al crear/editar la plantilla. Esta API usa el esquema
 * `OAuth` (no `Bearer`) y el offset va en un header propio.
 */
export async function graphUploadToSession(
  token: string,
  sessionId: string,
  bytes: Uint8Array
): Promise<string> {
  const env = getEnv();
  const url = `${env.META_GRAPH_BASE_URL}/${env.META_GRAPH_API_VERSION}/${sessionId}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${token}`,
        file_offset: "0",
        "Content-Type": "application/octet-stream",
      },
      body: bytes as BodyInit,
    });
  } catch (cause) {
    throw new MetaApiError("No se pudo contactar la API de Meta", {
      status: 0,
      details: cause,
    });
  }
  const text = await res.text();
  let json: { h?: string; error?: { message?: string; code?: number; type?: string } } | null =
    null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // no-JSON: details conserva el texto
  }
  if (!res.ok || !json?.h) {
    throw new MetaApiError(
      json?.error?.message ?? `La subida del archivo falló (${res.status})`,
      {
        status: res.status,
        code: json?.error?.code ?? null,
        type: json?.error?.type ?? null,
        details: json ?? text,
      }
    );
  }
  return json.h;
}

async function graphFetch<T>(
  path: string,
  opts: {
    method: "GET" | "POST" | "DELETE";
    token: string;
    contentType: string | null;
    body?: BodyInit;
  }
): Promise<T> {
  const env = getEnv();
  const url = `${env.META_GRAPH_BASE_URL}/${env.META_GRAPH_API_VERSION}/${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method,
      headers: {
        Authorization: `Bearer ${opts.token}`,
        ...(opts.contentType ? { "Content-Type": opts.contentType } : {}),
      },
      body: opts.body,
    });
  } catch (cause) {
    throw new MetaApiError("No se pudo contactar la API de Meta", {
      status: 0,
      details: cause,
    });
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // respuesta no-JSON: se conserva el texto crudo en details
  }

  if (!res.ok) {
    const err = (json as { error?: { message?: string; code?: number; type?: string } })
      ?.error;
    throw new MetaApiError(err?.message ?? `Meta respondió ${res.status}`, {
      status: res.status,
      code: err?.code ?? null,
      type: err?.type ?? null,
      details: json ?? text,
    });
  }
  return json as T;
}

/**
 * Normaliza el destinatario para el envío. Números móviles de México llegan
 * de Meta como `521` + 10 dígitos (13 en total); enviar con ese `1` extra
 * produce el error 131030 — se envía como `52` + 10 dígitos.
 * El wa_id almacenado NO se modifica; esto aplica solo al enviar.
 */
export function normalizeRecipient(waId: string): string {
  if (/^521\d{10}$/.test(waId)) {
    return `52${waId.slice(3)}`;
  }
  return waId;
}
