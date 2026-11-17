# Plan 046

1. Compartir con SMS el prompt y la política de agenda del agente WhatsApp, adaptando idioma, historial y límite de texto al canal.
2. Persistir el estado de derivación SMS y habilitar asignación/notificación humana basada en ese estado.
3. Ejecutar de forma segura las acciones de reunión, nota, etapa y seguimiento para el contacto CRM vinculado por teléfono. El seguimiento solicitado se envía por SMS con reserva idempotente y se cancela ante respuesta.
4. Añadir pruebas de comportamiento con mocks para oferta de horarios, reserva confirmada, derivación, errores y aislamiento; ejecutar gate técnico completo.
5. Desplegar el commit exacto en Coolify y verificar salud y versión activa.
