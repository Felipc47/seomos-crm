# Research: Créditos de IA por empresa

## Decisión 1: unidad comercial

**Decision**: 1 crédito equivale a una intervención completa del agente sobre una conversación real, no a cada mensaje ni a cada llamada interna.

**Rationale**: Es comprensible al cotizar y estable frente a cambios internos. Una intervención puede agrupar mensajes, leer medios, reintentar el proveedor, ejecutar acciones y actualizar el perfil del lead.

**Alternatives considered**:

- Tokens exactos: precisos para costo técnico, difíciles de explicar, vender y anticipar.
- Una llamada LLM = un crédito: expone al cliente a decisiones internas como perfilado y reintentos.
- Un mensaje entrante = un crédito: cobra varias veces mensajes agrupados que producen una sola respuesta.

## Decisión 2: bolsa recargable

**Decision**: Saldo no negativo, sin vencimiento ni renovación automática; el superadministrador agrega paquetes manualmente.

**Rationale**: Es la operación más simple para una agencia revendedora y cumple self-hosted sin introducir planes, moneda, impuestos ni pagos.

**Alternatives considered**:

- Cupo mensual automático: requiere calendario, prorrateos y política de remanentes.
- Billing por dinero: está fuera del foco y Stripe está prohibido por la constitución.
- Límite solo por tasa: protege picos, no el costo total del paquete.

## Decisión 3: consumos secundarios

**Decision**: Seguimiento contextual = 1 crédito. Plantilla de WhatsApp sin IA = 0. El Laboratorio fue retirado del producto por decisión del dueño y no tiene precio ni consumo.

**Rationale**: El seguimiento contextual sí cruza el proveedor; una plantilla preaprobada no. Retirar el Laboratorio evita vender o ejecutar un consumo interno que no forma parte del alcance comercial.

## Decisión 4: reserva e idempotencia

**Decision**: Insertar primero un movimiento con referencia única dentro de una transacción y descontar con una actualización condicionada a `balance >= amount`. Un duplicado de referencia se considera ya pagado y no descuenta de nuevo.

**Rationale**: Previene doble cobro por reintentos y saldo negativo por concurrencia sin depender de locks en memoria, que no protegen múltiples procesos.

## Decisión 5: agotamiento

**Decision**: Reservar antes de la primera llamada LLM. Sin saldo, una conversación real pasa a handoff `creditos` y un seguimiento deja nota y se omite. Las rutas históricas del Laboratorio no existen y responden 404 antes de cualquier trabajo.

**Rationale**: El techo de costo debe actuar antes del proveedor y cada flujo necesita un resultado observable, no un fallo silencioso.

## Decisión 6: migración

**Decision**: Organizaciones existentes y la organización fundadora de una instalación limpia reciben 1.000 créditos de transición/puesta en marcha; las empresas cliente creadas después por el superadministrador nacen en 0.

**Rationale**: Evita apagar el agente al desplegar sobre clientes actuales y obliga a que nuevas ventas reciban una asignación comercial explícita.

## Decisión 7: fallo después de reservar

**Decision**: No reembolsar automáticamente cuando el proveedor falla después de comenzar la intervención.

**Rationale**: El proveedor puede haber facturado entrada o intentos aunque no entregue una respuesta útil. Los reintentos internos no cobran nuevos créditos.
