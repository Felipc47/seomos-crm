# Contratos implementados

- GET/PUT/DELETE /api/settings/ecommerce: solo administrador de la empresa.
  PUT valida y prueba conexión/catálogo antes de persistir. GET nunca devuelve
  claves; el catálogo tiene prueba de solo lectura en POST /test.
- Conexión opcional, pedidos apagados por defecto; secreto AES-256-GCM y nueva
  identidad por reconexión. Activar misión ecommerce no conecta ni da permisos.
- commerce_search(query), commerce_prepare(items,buyer), commerce_confirm y
  commerce_order_status(reference). Una acción tipada por turno, IDs resueltos
  contra catálogo consultado; teléfono proviene del contacto, nunca del modelo.
- Resumen válido 15 minutos y realmente enviado antes de la confirmación. Una
  confirmación inequívoca posterior crea un único intento; revalida precio,
  moneda y existencias. No acepta un precio, URL de API o secreto del modelo.
- WooCommerce REST wc/v3: productos/variaciones y órdenes; status=pending,
  set_paid=false. Shopify Admin GraphQL 2026-10: productVariants, orderCreate
  financialStatus=PENDING, transactions=[], inventario DECREMENT_OBEYING_POLICY,
  sendReceipt/sendFulfillmentReceipt=false. Token Admin offline de app propia.
- Subtotal de productos confirmado; envío e impuestos finales los revisa la
  tienda antes del pago. No aplica promociones, cotiza transporte ni cobra.
- HTTPS con DNS público fijado, sin redirecciones de credenciales, límites y
  timeout. No hay reintentos automáticos de POST. Resultado ambiguo se conserva
  y reconcilia por lectura; rechazo explícito permite nuevo resumen/confirmación.
- Consulta de pedido requiere que el teléfono de la tienda coincida con el
  WhatsApp del contacto. No expone direcciones, correo ni datos de terceros.
- Demo previsualiza acciones sin llamar al ecommerce. Mocks solo con gate de
  desarrollo y hosts de prueba; en producción las rutas dev son 404.

## Documentación oficial revisada

- https://developer.woocommerce.com/docs/apis/rest-api/v3/orders/
- https://developer.woocommerce.com/docs/apis/rest-api/v3/products/
- https://shopify.dev/docs/api/admin-graphql/2026-10/queries/productVariants
- https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/orderCreate
- https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/OrderCreateOptionsInput
- https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/OrderCreateOrderInput
