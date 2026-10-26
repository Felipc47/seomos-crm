# 037 — Ecommerce reutilizable

Preparar PostgreSQL aislado `seomos_ecommerce_037` en localhost:5433 y aplicar
migraciones con `DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seomos_ecommerce_037 MIGRATIONS_DIR="$PWD/drizzle" node scripts/migrate.mjs`.

Arrancar `node tests/e2e/ecommerce-start.mjs`; ejecutar `node tests/e2e/ecommerce.mjs`.
Usa Chrome/Playwright, WA/IA mocks y hosts explícitos `woo.commerce.test` y
`shop.commerce.test`. La reescritura al proveedor simulado está deshabilitada en
producción, como todas las rutas `/api/dev/ecommerce-mock/*`.

Cubre UI de conexión, credenciales cifradas/no reflejadas, catálogo/variantes,
pedidos pendientes de pago después de resumen enviado y confirmación posterior,
repetición y respuesta perdida, precio/stock/cantidad, identidad por WhatsApp,
resúmenes vencidos o no enviados, pérdida de acceso, JSON inválido, otra misión,
creación apagada, demo sin efectos, móvil y roles/empresa B.

Evidencia: `.artifacts/ecommerce/`. No usa tienda comercial, cobra ni crea pedidos
reales. La conexión comercial está pendiente de que el dueño disponga de una tienda.
