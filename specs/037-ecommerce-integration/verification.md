# Verificación — 2026-10-26

- Tipos, lint y build de producción correctos. Suite completa: 536 unitarios,
  60 archivos; contratos URL, DNS privado, importes decimales, consentimiento,
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
- Total: 71 comprobaciones de comportamiento aprobadas.
- Migración 0033 generada por Drizzle y aplicada dos veces al PostgreSQL aislado
  seomos_ecommerce_037. Índice parcial único impide dos intentos activos por chat.
- Vigencia de catálogo/resumen usa el reloj de PostgreSQL, verificada con la BD
  local configurada en America/Bogota. No depende de Date.now del proceso.
- Evidencia local: .artifacts/ecommerce/{build.log,unit.log,e2e.json,e2e.log,
  order-edges.json,order-edges.log,woocommerce-settings.png,shopify-settings.png,mobile.png}.

La tienda comercial real no se ha conectado: el dueño confirmó que todavía no
hay una específica. Las pruebas externas usan exclusivamente mocks con datos y
credenciales ficticios. Queda para cuando exista una tienda validar su acceso,
permisos efectivos, configuración de impuestos/envío y comportamiento de plugins.
No se crearon pedidos comerciales ni se ejecutaron cobros.
