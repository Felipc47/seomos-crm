# E2E — Créditos de IA por empresa

## Camino feliz

1. Entrar como superadministrador y abrir `/companies`.
2. Abrir la recarga de la empresa de prueba, agregar 3 créditos y comprobar el nuevo saldo en su tarjeta.
3. Entrar a la organización de prueba, abrir `/agent` y comprobar el mismo saldo y las reglas 1/1.
4. Activar el agente e inyectar un mensaje entrante por `wa-mock`.
5. Comprobar respuesta automática, un único movimiento `agent_turn` y saldo reducido exactamente en 1.
6. Reintentar la misma referencia y comprobar que el saldo no cambia.

## Camino infeliz

1. Preparar una organización con saldo 0 y agente activo.
2. Registrar el contador de llamadas de `ai-mock` e inyectar un entrante nuevo.
3. Comprobar que el contador no aumenta, no aparece salida automática y el chat muestra `Créditos de IA agotados`.
4. Recargar saldo y comprobar que el handoff sigue activo hasta una reactivación manual.

## Función retirada

1. Registrar saldo y contador de llamadas del `ai-mock`.
2. Solicitar las rutas históricas bajo `/api/lab/*` y comprobar 404 en todos los métodos.
3. Confirmar que ni el saldo ni el contador de llamadas cambian.
