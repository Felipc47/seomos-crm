# Self-test — IA reactiva desde el chat

Ejecutar contra `pnpm dev` con PostgreSQL local en `:5433`, `wa-mock`,
`ai-mock` y `OPENROUTER_API_TOKEN` de prueba. El guion reinicia la base de
datos de desarrollo.

## Camino feliz

1. Crear una organización, conectar el WhatsApp mock y dejar el agente global
   apagado.
2. Recibir un mensaje, pausar su conversación y encender el agente global.
3. Abrir Bandeja y comprobar que el encabezado muestra el switch apagado sin
   abrir Ver detalles.
4. Encenderlo desde el encabezado.
5. Comprobar el feedback “respondiendo el mensaje pendiente”, una única salida
   en el wa-mock y un único mensaje IA en el hilo.
6. Abrir Ver detalles, comprobar el mismo estado, apagar allí y verificar que
   el encabezado se sincroniza.
7. Volver a encender una conversación ya respondida y comprobar cero salidas
   adicionales.

## Guardrails y caminos infelices

8. Consultar `/api/agent/status`: solo expone disponibilidad, nunca perfil,
   prompt ni instrucciones.
9. Reactivar un entrante de hace 25 horas: devuelve `window_closed` y no toca
   el outbox.
10. Forzar un fallo de chat del proveedor: la petición HTTP no se cuelga, el
    pipeline aplica handoff `error` y no envía.
11. Reactivar un entrante que pide una persona: el pipeline conserva handoff
    `cliente` y no envía.
12. Verificar control por teclado, ausencia de errores del navegador y cero
    overflow horizontal a 375, 768 y 1440 píxeles.
