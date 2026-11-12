import { getEnv, isMockEnabled } from "@/lib/env";
import { SheetsError } from "@/lib/sheets-contacts";

const MAX_BYTES = 5_000_000;
export function allowedSheetsRedirect(url: URL) {
  return url.protocol === "https:" && !url.port && !url.username && !url.password &&
    (url.hostname === "docs.google.com" || url.hostname === "sheets.google.com" || url.hostname.endsWith(".googleusercontent.com"));
}

/** Dedicated read-only adapter. Build destination from validated identifiers, never a supplied URL. */
export async function fetchSheetCsv(source: { spreadsheetId: string; sheetGid: string }) {
  if (!/^[\w-]{20,100}$/.test(source.spreadsheetId) || !/^\d{1,15}$/.test(source.sheetGid)) throw new SheetsError("El enlace guardado no es válido.");
  const mock = isMockEnabled();
  let url = new URL(mock
    ? `${getEnv().APP_BASE_URL}/api/dev/sheets-mock?gid=${source.sheetGid}`
    : `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/export?format=csv&gid=${source.sheetGid}`);
  const signal = AbortSignal.timeout(20000);
  try {
    for (let redirects = 0; redirects < 5; redirects++) {
      const res = await fetch(url, { redirect: "manual", signal, cache: "no-store" });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location");
        await res.body?.cancel();
        if (!location) break;
        const next = new URL(location, url);
        if (mock || !allowedSheetsRedirect(next)) throw new SheetsError("No se pudo leer la hoja. Revisa que el enlace permita acceso de lectura y que la pestaña exista.");
        url = next; continue;
      }
      if (!res.ok || !/\b(?:text\/csv|application\/csv|text\/plain)\b/i.test(res.headers.get("content-type") ?? "")) {
        await res.body?.cancel();
        throw new SheetsError("No se pudo leer la hoja. Revisa el acceso de lectura por enlace y la pestaña seleccionada.");
      }
      if (Number(res.headers.get("content-length")) > MAX_BYTES) { await res.body?.cancel(); throw new SheetsError("La hoja supera el límite de 5 MB."); }
      const reader = res.body?.getReader();
      if (!reader) throw new SheetsError("La hoja está vacía.");
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length;
        if (size > MAX_BYTES) { await reader.cancel(); throw new SheetsError("La hoja supera el límite de 5 MB."); }
        chunks.push(value);
      }
      return Buffer.concat(chunks).toString("utf8");
    }
    throw new SheetsError("Google redirigió demasiadas veces. Revisa el acceso a la hoja.");
  } catch (error) {
    if (error instanceof SheetsError) throw error;
    throw new SheetsError("Google Sheets no respondió a tiempo. Se reintentará en el próximo ciclo.");
  }
}
