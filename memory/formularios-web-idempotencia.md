# Formularios web: idempotencia y efectos secundarios

- Reserva `(organization_id, integration_id, external_id)` ANTES de tocar contacto, lead, notificaciones o WhatsApp. Un duplicado concurrente pierde en el índice único y no ejecuta dominio.
- El ledger no guarda payload/cabeceras/secreto. Solo estado, relaciones, error sanitizado y timestamps.
- Si el proceso falla tras una escritura parcial, los helpers de contacto/conversación/lead y el marcador incluido en la nota hacen el reintento idempotente; un `processing` antiguo puede reclamarse.
- Para efectos sin idempotency key del proveedor, fija `greeting_attempted_at` ANTES de llamar. Se prefiere omitir un saludo tras un crash extremo a duplicarlo.
- Persiste el prospecto y responde antes de proveedores lentos; `after()` ejecuta email, notificación, SSE y saludo. Un fallo secundario actualiza un diagnóstico controlado sin revertir el lead ni guardar la respuesta cruda.
- En Ajustes, no conviertas simultáneamente la navegación principal y la secundaria en sidebars cuando el ancho disponible queda pequeño. La secundaria usa `lg` y la pestaña horizontal activa se centra por debajo de 1024 px.
