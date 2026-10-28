# US42: chat demo del agente

Ejecutar `node tests/e2e/us42-agent-demo.mjs` con Next dev en localhost:3103, BD local seomos_demo_032, WA_MOCK_ENABLED=true, META_GRAPH_BASE_URL=http://localhost:3103/api/dev/wa-mock/graph y OPENROUTER_BASE_URL=http://localhost:3103/api/dev/ai-mock. El guion rechaza destinos de producción.

Prueba UI con agente apagado y sin WhatsApp: configuración sin guardar, tres idiomas, historial/nombre recordado, KB de cada empresa, reinicio/cierre, JSON envuelto, proveedor caído, JSON inválido, acciones simuladas y handoff, móvil y teclado. Compara contactos/conversaciones/mensajes/leads/calendarios/créditos/conexiones y outbox antes/después; no debe existir ningún efecto. Comprueba 401, rol 403, payloads prohibidos 422 y tasa 429. El proveedor determinista comprueba cableado; no certifica calidad lingüística de un proveedor real.
