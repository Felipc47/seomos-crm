# Verificación — 2026-10-26

- Tipos, lint y build de producción correctos. Suite completa: 546 unitarios,
  62 archivos; contratos URL, DNS privado, importes decimales, consentimiento,
  identidad telefónica, acciones y demo.
- Playwright + WA/IA mocks y tiendas ficticias WooCommerce/Shopify: 62/62.
  Configuración guardada/recarga, catálogo/variantes, credenciales cifradas sin
  reflejarlas, resumen antes de pedido, confirmación posterior, pedido sin pagar,
  repetición, identidad de comprador, precio/stock/cantidad, caída/revocación/JSON,
  pérdida de respuesta y reconciliación sin duplicado, demo y UI móvil, permisos
  y aislamiento de empresa B. Capturas desktop/móvil revisadas visualmente.
- Pruebas complementarias de canal/BD: 9/9. Variante Woo específica, confirmaciones
  simultáneas + redelivery, única persistencia, reconexión, cambio de moneda,
  rechazo explícito sin crear y nuevo resumen/confirmación para recuperarse.
- Dos unitarios adicionales impiden exponer borradores de catálogo y tratan los operadores de búsqueda como texto.
- Shopify con app propia actual: 7/7. Formulario Client ID/Secret, intercambio
  por grant, cache compartida entre rutas, renovación al vencer, revocación,
  recuperación y pedido sin pagar desde el acceso renovado. Se conserva el modo
  token existente; 8 unitarios específicos cubren cache/rotación/aislamiento.
- Total: 78 comprobaciones de comportamiento aprobadas.
- Migración 0033 generada por Drizzle y aplicada dos veces al PostgreSQL aislado
  seomos_ecommerce_037. Índice parcial único impide dos intentos activos por chat.
- Vigencia de catálogo/resumen usa el reloj de PostgreSQL, verificada con la BD
  local configurada en America/Bogota. No depende de Date.now del proceso.
- Evidencia local: .artifacts/ecommerce/{build.log,unit.log,e2e.json,e2e.log,
  order-edges.json,order-edges.log,woocommerce-settings.png,shopify-settings.png,mobile.png,shopify-access.json,shopify-app-access.png}.

La tienda comercial real no se ha conectado: el dueño confirmó que todavía no
hay una específica. Las pruebas externas usan exclusivamente mocks con datos y
credenciales ficticios. Queda para cuando exista una tienda validar su acceso,
permisos efectivos, configuración de impuestos/envío y comportamiento de plugins.
No se crearon pedidos comerciales ni se ejecutaron cobros.

Gate final: typecheck, lint y next build correctos. Suite íntegra ejecutada con
`vitest run --maxWorkers=1 --minWorkers=1`: 546/546 en 15,67 s. La ejecución
paralela en este equipo agotaba 5 s durante imports de pruebas existentes; no se
cambiaron esas pruebas ni sus timeouts. Captura Shopify de app propia revisada.
