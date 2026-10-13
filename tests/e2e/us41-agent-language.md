# US41: idioma de respuesta

Ejecutar `node tests/e2e/us41-agent-language.mjs` con Next dev en localhost:3102 y BD seomos_language_031 exclusivamente. Configurar WA_MOCK_ENABLED=true, META_GRAPH_BASE_URL=http://localhost:3102/api/dev/wa-mock/graph y OPENROUTER_BASE_URL=http://localhost:3102/api/dev/ai-mock. Todo envío permanece en mocks; nunca usar producción.

El guion conduce registro/formulario, valida persistencia, español ante entrada inglesa, inglés ante entrada española con JSON envuelto, cambio bilingüe en la misma conversación, rechazo de idioma inválido, aislamiento por empresa, caída del proveedor con handoff y pantalla móvil a 390 px. El proveedor determinista valida el cableado de la política; la calidad lingüística de modelos externos no queda certificada por mocks. No envía mensajes a destinatarios reales.
