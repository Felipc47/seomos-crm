# Plan

Extraer contrato del formulario a módulo puro Zod compartido; agregar endpoint POST /api/agent/demo que solo lee perfil/KB/etapas/servicios con scoped(), compone prompt compartido y llama chatJson con AgentAction; convertir acción en respuesta de demo sin importaciones de ejecución. Mostrar calendario como simulación sin conectar APIs. Nuevo componente de chat dentro de ProfileSection, configuración en vivo, historial temporal, reset, error y cancelación.

Constitution check: tenant/roles + validación, mismo adaptador LLM, ningún secreto al cliente, sin dominio persistido ni migraciones; mocks cerrados en producción. No reintroducir Laboratorio. Gate de tipos/lint/build/tests y E2E con BD local seomos_demo_032 en :5433, Next en :3103, WA/AI mocks. Checkout aislado en producción 445b4d4; publicar solo archivos de esta feature y fijar SHA exacto en Coolify.
