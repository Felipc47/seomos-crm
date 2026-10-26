# 037 — Integración real de ecommerce

## Solicitud y estado

El 2026-10-26 el dueño confirmó «Conexión real de catálogo y pedidos» para la
misión Vender con ecommerce. Amplía la función 036, ya publicada, que por ahora
solo usa enlace de tienda y conocimiento. Esta integración aún no está implementada
ni conectada en producción.

Decisiones confirmadas el 2026-10-26: todavía no hay una tienda específica y el
bot debe crear pedidos sin pagar tras confirmación. Se prepara un conector
reutilizable para WooCommerce y Shopify; el administrador elegirá y conectará
la tienda de su empresa cuando exista. No se asume una cuenta ni se inventa acceso.
La conexión con una tienda comercial concreta queda expresamente pendiente.

Alcance de importes: el resumen confirma productos, cantidades, subtotal y datos
de envío; informa que envío/impuestos finales los valida la tienda antes de
pagar. No se cobran pagos, aplican cupones ni calculan tarifas de transporte.

## Resultado requerido

- El administrador conecta la tienda de SU empresa desde el CRM. La UI muestra
  estado y tienda vinculada; otros tenants no acceden a conexión ni operaciones.
- El bot consulta catálogo real, variantes, precio, moneda y disponibilidad
  confirmados por la tienda. Distingue disponibilidad no informada de stock cero.
- No inventa existencias, descuentos, enlaces de pago ni confirmaciones de pedido.
- La consulta de pedidos se limita al cliente identificado y al tenant actual;
  saber el número de un pedido por sí solo no expone datos de otra persona.
- Creación de pedido pendiente de pago tras confirmación explícita.
  Crear pedidos exige resumen y confirmación del cliente, validaciones de productos,
  cantidades y condiciones en servidor e idempotencia ante reintentos.
- Elegir la misión ecommerce no conecta una cuenta ni activa operaciones externas
  por sí solo. Entrenamiento, agenda opcional y mínimo de mensajes se preservan.
- Desconexión, credencial revocada, timeout, producto agotado o formato inesperado
  producen respuesta honesta y posibilidad de continuar/derivar sin bloquear WhatsApp.
- La demo usa la misma configuración comercial y no crea pedidos reales.

## Verificación requerida

Tipos, lint, build y unitarios; Playwright + mocks del ecommerce y WA/IA, flujo
feliz e infeliz, permisos y aislamiento, producto/variante agotados, cambios de
precio/stock, identidad del comprador y reintentos sin pedidos duplicados.
Después se comprueba la conexión con la tienda identificada, sin generar pedidos
reales de prueba ni publicar hasta contar con el alcance y acceso necesarios.

Los contratos de autenticación, versión de API y campos se documentan en
contracts.md sobre documentación oficial vigente. No hay conexión comercial real.
