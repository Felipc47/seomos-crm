# Quickstart: verificación de créditos IA

## Preparación

1. Aplicar migraciones y arrancar el entorno local con mocks de WhatsApp e IA según `specs/001-seomos-core/quickstart.md`.
2. Iniciar sesión como superadministrador.
3. Abrir **Empresas** y confirmar que cada tarjeta muestra su saldo.

## Camino feliz

1. Recargar 3 créditos a una empresa desde su tarjeta.
2. Entrar a esa organización y abrir **Agente**; verificar saldo 3 y reglas de consumo.
3. Inyectar un mensaje entrante real mediante `wa-mock`.
4. Observar una respuesta automática y saldo 2.
5. Reprocesar la misma referencia; comprobar que el saldo sigue en 2.

## Camino infeliz

1. Consumir o configurar el saldo a 0 en la preparación de prueba.
2. Inyectar un mensaje entrante nuevo.
3. Comprobar que no aparece respuesta automática, la conversación muestra "Créditos agotados" y el contador de llamadas del mock IA no aumenta.
4. Recargar créditos; comprobar que la conversación permanece entregada a humano hasta reactivarla.

## Función retirada

1. Solicitar `GET /api/lab/runs`, `POST /api/lab/runs`, `GET /api/lab/runs/cualquiera` y `POST /api/lab/suggestions/apply`.
2. Todas deben responder 404; el contador del mock IA y el saldo deben permanecer sin cambios.

## Gate técnico

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
```

## Resultado verificado — 2026-08-19

- Recarga UI: 1.000 → 1.003, visible en Empresas y Agente.
- Intervención con saldo 1: una respuesta, un movimiento `-1`; dos llamadas internas incluidas.
- Saldo 0: handoff `creditos`, cero salidas y cero llamadas nuevas al mock IA.
- Empresa cliente nueva: saldo 0; su admin recibe 403 al intentar recargar; el superadmin puede hacerlo.
- Laboratorio retirado: rutas, runner, personas y juez eliminados; costo de 25 créditos eliminado del contrato y la UI.
- UI inspeccionada en escritorio y 390×844; detector de layout sin hallazgos.
- Retiro E2E: las cuatro variantes históricas verificadas responden 404; `chatCalls` y `transcriptionCalls` permanecen en 0; saldo visible permanece en 977.
- UI Agente: regla visible 1/1, cero menciones al Laboratorio y cero errores de navegador.
- Gate final: build verde; 44 archivos de tests y 286 pruebas verdes.
