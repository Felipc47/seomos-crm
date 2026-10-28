# Plan de implementación — 2026-10-28

Base aislada: unión de 9f04516 (rediseño visual) y 8e41285 (funciones ya
publicadas y conexión Brevo local). Conservar ambos conjuntos sin tocar el
checkout principal que tiene trabajo ajeno sin confirmar.

1. Extender conexión, contacto SMS, mensaje y ledger de eventos; migración nueva.
2. Adaptador Brevo de envío y registro de webhook autenticado; mocks locales
   cerrados en producción; consultas sin datos crudos del proveedor en errores.
3. Dominio SMS con scoped(), consentimiento, outbox, deduplicación y estados.
4. Endpoints autenticados y UI SMS por empresa; controles administrativos.
5. Typecheck, lint, build, unitarios y E2E happy/unhappy path.
6. Preparar credencial restringida y verificar estado real de cuenta/remitente.
   Configuración externa final y prueba real dependen de los requisitos observados.

Constitución: ya permite Brevo opcional exclusivamente SMS en 8e41285.
No dependencias runtime nuevas; secretos AES-GCM, idempotencia y tenant obligatorios.
