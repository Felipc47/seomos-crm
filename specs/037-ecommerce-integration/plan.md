# Plan — WooCommerce y Shopify, pedidos pendientes de pago

## Descubrimiento verificado

- No existe conector de tiendas en src/ ni credenciales ecommerce en .env.example.
- 036 persiste misión/enlace y ya tiene política compartida para pipeline/demo/seguimiento.
- Reutilizar encryptSecret/decryptSecret de src/lib/crypto y el patrón tenant-scoped
  de src/server/google/credentials.ts; permisos de administración existentes.
- Las URLs de tiendas requieren transporte que rechace redes internas, DNS inseguro
  y redirects que filtren credenciales. src/server/ai/website-reader.ts aporta patrón
  de validación/transporte, pero su lector HTML no es un cliente de ecommerce.
- AgentAction exige una acción tipada por turno; extender mediante operaciones
  validadas de comercio, sin permitir que el modelo dicte URLs o credenciales.

## Ejecución

1. Contrato de catálogo/pedidos y adaptador(s) dedicado(s) de la plataforma elegida,
   basado en documentación oficial actual; definir timeout, paginación y errores.
2. Conexión opcional por empresa, secretos cifrados, migración aditiva e inputs Zod.
   No enviar credenciales de vuelta al navegador, al modelo ni a logs.
3. Configuración de tienda y prueba de conexión en Ajustes; estado en Agente para
   misión ecommerce. Guardado y conexión explícitos, sin activar por seleccionar misión.
4. Lecturas de productos/precios/stock, pedidos ligados al cliente y checkout o
   pedido pendiente con resumen y confirmación del cliente. Validación de servidor,
   confirmación explícita e idempotencia de cualquier escritura externa.
5. Contexto/acciones comerciales en el agente; mantener clasificación de servicios,
   idioma, reglas de agenda, espera opcional, sandbox y ventana de WhatsApp.
6. Mocks detrás del gate de desarrollo, demo sin escrituras externas y E2E completo.
7. Gate técnico, verificación de conexión real y publicación del cambio validado.

## Constitución y configuración

La autorización directa de ecommerce real requiere registrar una ampliación acotada
al principio II (dependencias opcionales de ecommerce) y sincronizar AGENTS.md y
los documentos dependientes. El dueño pidió crear pedidos sin pagar y no tiene tienda específica: se ofrecen
ambas plataformas reutilizables sin conectar cuentas por defecto.

No se han creado credenciales ni variables especulativas. Si el adaptador necesita
nuevas variables globales, añadir placeholders REEMPLAZA_ con guía inline a .env
local y .env.example, e instalarlas en runtime al preparar el despliegue. Credenciales
por tienda se administrarán en su conexión aislada por empresa.

Decisión técnica: WooCommerce REST wc/v3; Shopify Admin GraphQL 2026-10 con
orderCreate financialStatus=PENDING, sin transacciones ni recibos automáticos,
inventoryBehaviour=DECREMENT_OBEYING_POLICY. Se revalidan productos y se registra
un intento persistente antes de escribir. Si la respuesta de escritura es ambigua,
no se repite la creación; se conserva el intento para reconciliación de lectura.
La confirmación requiere resumen realmente enviado y un entrante posterior.
