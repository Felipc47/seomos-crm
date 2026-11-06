/** Operación explícita, sin ejecución al arrancar: node scripts/set-organization-timezone.mjs org_id=America/Bogota [...]. */
import postgres from "postgres";
const entries = process.argv.slice(2).map(entry => {
  const [id, timezone, extra] = entry.split("=");
  if (!id || !timezone || extra || (timezone !== "UTC" && !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+$/.test(timezone))) throw Error("Usa org_id=Zona/IANA");
  new Intl.DateTimeFormat("es-CO", { timeZone: timezone }).format();
  return { id, timezone };
});
if (!entries.length) throw Error("Indica al menos una empresa y zona horaria");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  await sql.begin(async tx => {
    for (const { id, timezone } of entries) {
      const rows = await tx`update organization set metadata = jsonb_set(
        coalesce(metadata::jsonb, '{}'::jsonb), '{calendar}',
        coalesce(metadata::jsonb->'calendar', '{}'::jsonb) || jsonb_build_object('timezone', ${timezone}::text)
      )::text where id = ${id} and deleted_at is null returning id`;
      if (rows.length !== 1) throw Error(`Empresa no encontrada: ${id}`);
    }
  });
  console.log(JSON.stringify({ configured: entries }));
} finally { await sql.end(); }
