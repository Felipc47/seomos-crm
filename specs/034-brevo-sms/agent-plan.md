# Plan — agente SMS

Base: commit 0d21f24, Bandeja unificada publicada.

1. Añadir activación por contacto y origen de mensaje con migración aditiva (apagado/manual por defecto).
2. Exponer control IA por hilo y API PATCH con tenant, rol y disponibilidad global.
3. Disparar turnos solo tras insertar un entrante SMS nuevo. Coalescer por contacto y revalidar estado antes de consumir IA y antes de enviar.
4. Generar respuesta con el perfil/KB existente, contrato restringido para SMS y máximo un segmento. Reutilizar reserva de créditos IA y envío Brevo con operación determinística.
5. E2E con mocks: respuesta automática, duplicados, STOP, apagado, humano, error LLM/Brevo, saldo, rol y tenant; gate técnico y verificación visual. Publicar sin enviar SMS reales.
