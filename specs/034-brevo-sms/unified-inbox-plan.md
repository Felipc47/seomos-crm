# Plan — Bandeja unificada

Base: commit `006b450` publicado, en worktree aislado del SSD.

1. Ampliar `/api/sms` con último mensaje y actividad por contacto, siempre con alcance de organización. Sin migración.
2. Integrar SMS en el cliente de Bandeja: lista cronológica, búsqueda, pills y filtro de canal. Mantener acciones masivas y filtros de pipeline solo para WhatsApp.
3. Extraer el hilo SMS a un panel embebido con el mismo flujo seguro de consentimiento, revisión y envío; agregar alta de contacto en Bandeja.
4. Redirigir `/sms`, retirar su enlace de navegación, conservar endpoints y ajustes de Brevo.
5. Gate técnico y E2E con mocks para ambos canales, roles, aislamiento, saldo/baja, respuesta, navegación y móvil. Verificar visualmente antes de publicar.
