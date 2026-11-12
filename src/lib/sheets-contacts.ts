import { z } from "zod";
import { parseCsv } from "@/lib/csv";

export const sheetsInput = z.object({
  name: z.string().trim().min(1).max(80),
  url: z.string().trim().max(500),
  intervalMinutes: z.number().int().min(1).max(1440).default(5),
});
export const sheetsPatch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  intervalMinutes: z.number().int().min(1).max(1440).optional(),
  enabled: z.boolean().optional(),
}).strict();

export class SheetsError extends Error {}

export function parseSheetsUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new SheetsError("Pega un enlace válido de Google Sheets."); }
  const match = url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,100})(?:\/|$)/);
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || url.port || url.username || url.password || !match?.[1]) {
    throw new SheetsError("Usa un enlace https://docs.google.com/spreadsheets/d/…");
  }
  const gid = new URLSearchParams(url.hash.slice(1)).get("gid") ?? url.searchParams.get("gid") ?? "0";
  if (!/^\d{1,15}$/.test(gid)) throw new SheetsError("La pestaña del enlace no es válida.");
  return { spreadsheetId: match[1], sheetGid: gid };
}

export function sheetsUrl(source: { spreadsheetId: string; sheetGid: string }) {
  return `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/edit#gid=${source.sheetGid}`;
}

export type SheetContact = {
  row: number; externalKey: string; phone: string; name: string; email: string | null; details: string;
};
export type SyncStats = { created: number; updated: number; unchanged: number; skipped: number; issues: { row: number; reason: string }[] };
const normalize = (h: string) => h.replace(/^\uFEFF/, "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]+/g, "_");
const aliases = { phone: ["phone_number", "phone", "telefono", "celular", "whatsapp"], name: ["full_name", "name", "nombre", "nombre_completo"], email: ["email", "correo", "correo_electronico"], id: ["id", "lead_id", "leadgen_id"] };

/** Source rows are data only: no message, stage, consent or execution instructions. */
export function parseSheetContacts(csv: string) {
  let rows: string[][];
  try { rows = parseCsv(csv, { preserveEmptyRows: true, strict: true }); } catch { throw new SheetsError("El CSV de la hoja no tiene un formato válido."); }
  while (rows.length && rows.at(-1)!.every(value => !value.trim())) rows.pop();
  const header = rows[0]?.map(normalize) ?? [];
  if (!header.length || header.length > 64 || new Set(header.filter(Boolean)).size !== header.filter(Boolean).length) throw new SheetsError("La hoja tiene encabezados vacíos, repetidos o más de 64 columnas.");
  const col = (key: keyof typeof aliases) => header.findIndex(h => aliases[key].includes(h));
  const phoneCol = col("phone"), nameCol = col("name"), emailCol = col("email"), idCol = col("id");
  if (phoneCol < 0 || nameCol < 0) throw new SheetsError("La primera fila debe incluir full_name y phone_number (o nombre y teléfono).");
  if (rows.length > 10001) throw new SheetsError("La pestaña supera el límite de 10000 contactos.");
  const contacts: SheetContact[] = [], issues: SyncStats["issues"] = [], keys = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]!;
    if (values.every(value => !value.trim())) continue;
    const val = (c: number) => (values[c] ?? "").trim();
    const raw = val(phoneCol).replace(/^p:/i, "");
    const phone = raw.replace(/[+\s().-]/g, "");
    const issue = (reason: string) => issues.push({ row: i + 1, reason });
    if (!/^\d{7,15}$/.test(phone)) { issue("Teléfono inválido o ausente"); continue; }
    if (values.length > header.length || values.some(v => v.length > 4000)) { issue("La fila supera el tamaño permitido"); continue; }
    const name = val(nameCol).slice(0, 120) || phone;
    const email = val(emailCol) || null;
    if (email && !z.string().email().max(254).safeParse(email).success) { issue("Correo inválido"); continue; }
    const externalKey = val(idCol) || `phone:${phone}`;
    if (externalKey.length > 200) { issue("Identificador demasiado largo"); continue; }
    if (keys.has(externalKey)) { issue("Identificador repetido en la hoja"); continue; }
    keys.add(externalKey);
    // JSON string escaping prevents source values from injecting managed-note markers.
    const details = header.map((h, c) => val(c) ? `${h}: ${JSON.stringify(val(c))}` : "").filter(Boolean).join("\n");
    if (details.length > 3000) { issue("La información de la fila supera 3000 caracteres"); continue; }
    contacts.push({ row: i + 1, externalKey, phone, name, email, details });
  }
  return { contacts, issues };
}

export type SheetSnapshot = { phone: string; name: string; email: string | null; noteBlock: string };
export function mergeSheetContact(current: { name: string; phone: string; email: string | null; notes: string | null }, previous: SheetSnapshot | null, incoming: SheetSnapshot) {
  const name = !current.name || current.name === current.phone || current.name === previous?.name ? incoming.name : current.name;
  const email = incoming.email && (!current.email || current.email === previous?.email) ? incoming.email : current.email;
  let notes = current.notes ?? "";
  if (!previous) notes = [notes, incoming.noteBlock].filter(Boolean).join("\n\n");
  else if (notes.includes(previous.noteBlock)) notes = notes.replace(previous.noteBlock, incoming.noteBlock);
  // An edited/removed source block belongs to the operator; leave it alone.
  return { name, email, notes };
}
