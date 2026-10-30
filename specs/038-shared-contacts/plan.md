# Plan

1. Normalizar campos soportados de messages[].contacts con Zod.
2. JSONB opcional en message mediante migración aditiva e idempotente.
3. DTO/SSE y tarjetas en MessageThread con fallback para históricos.
4. E2E webhook→BD→API/SSE→UI, recarga, móvil, inválidos, duplicados y tenants.
5. Gate completo, commit aislado, deploy Coolify al SHA y smoke autenticado.
