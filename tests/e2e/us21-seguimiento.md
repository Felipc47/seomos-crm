# US21 — Seguimiento automático (008)

**Objetivo**: cuando un cliente pide que lo contacten luego, o no responde al
primer mensaje del negocio, el sistema ejecuta la rutina 12h → +1 día hábil →
«No interesado», visible en el pipeline («Contactar luego» / «No contestó»).

## Cómo correrlo

1. Postgres local en `:5433` (BD `vocero`).
2. Dev server con mocks y secreto del cron:

```bash
WA_MOCK_ENABLED=true \
META_GRAPH_BASE_URL=http://localhost:3000/api/dev/wa-mock/graph \
OPENROUTER_BASE_URL=http://localhost:3000/api/dev/ai-mock \
OPENROUTER_API_TOKEN=test-token \
OPENROUTER_MODEL=test-model \
AGENT_SWEEP_SECRET=e2e-sweep \
AGENT_COALESCE_MS=300 \
pnpm dev
```

3. `bash tests/e2e/us21-seguimiento.sh`

## Qué verifica

- Las tres etapas nuevas aparecen en el tablero.
- Flujo A: «escríbeme más tarde» → acción `follow_up_later` del agente →
  etapa «Contactar luego» + despedida + intento programado.
- Camino infeliz: sin plantilla configurada y con la ventana de 24h cerrada,
  el intento se OMITE con nota `[IA]` y la rutina avanza sin colgarse hasta
  «No interesado».
- Con hora dicha por el cliente («en dos horas») el intento cae dentro de la
  ventana de 24h → mensaje contextual del LLM (rama condicionada al horario
  de ejecución del test).
- La respuesta del cliente cancela la rutina y devuelve el lead a
  «En conversación».
- Flujo B: campaña como primer mensaje sin respuesta → 12h después el barrido
  mueve el lead a «No contestó» y envía la plantilla de seguimiento; intento 2
  un día hábil después; la respuesta cancela.
- Viaje en el tiempo vía `/api/cron/sweep?now=` (solo con mocks activos).
