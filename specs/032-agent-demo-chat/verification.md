# Verificación

2026-10-12 America/Bogota. Base de producción 445b4d436c64bf259855ed4939f1128a78751310. Gate con los ejecutables locales equivalentes a scripts package.json: tsc --noEmit, eslint ., vitest run (53 archivos / 432 tests) y Next build, todos exitosos. Sin cambios a dependencias/lockfile. Probar con Playwright sobre Next dev :3103 y PostgreSQL seomos_demo_032; IA/WhatsApp simulados. US42: 57 comprobaciones verdes.

Demostrados: agente apagado, cero número/credenciales WhatsApp; borrador de nombre/idioma sin guardar; conversación/historial; tres modos; conocimiento separado por empresa; JSON envuelto; proveedor caído y formato inesperado con mensaje conservado/reintento; silencio; agendar/calificar/ficha/seguimiento simulados; handoff/reinicio; panel completo móvil 390x844; teclado/Escape; 401/403/422/429. Los contadores de contactos, conversaciones, mensajes, leads, calendarios, créditos y conexiones no cambiaron; outbox WhatsApp vacío; perfil persistido idéntico.

Capturas locales en .artifacts/us42-agent-demo/desktop.png y mobile.png. Las capturas esperan el fin de la animación del panel y comparan sus límites con el viewport. No hay llamadas reales a WhatsApp o Calendar ni prueba lingüística del modelo externo. Publicación y smoke de producción pendientes.
