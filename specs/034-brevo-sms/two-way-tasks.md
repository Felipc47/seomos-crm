# Estado durable — Brevo SMS bidireccional

- [x] Revisar solicitud, sesión corporativa, implementación anterior y docs oficiales.
- [x] Crear worktree aislado y reunir las bases funcional/visual existentes.
- [x] Especificar alcance y aceptación antes de escribir código.
- [x] Modelo y migración.
- [x] Adaptadores, dominio SMS y webhook autenticado.
- [x] UI de conexión y bandeja SMS.
- [x] Unitarios + typecheck/lint/build.
- [x] E2E de envío/entrega/recepción/respuesta y fallos.
- [x] Verificar estado real de Brevo y preparar credencial restringida.
- [x] Publicar PR #8, integrar main y desplegar 4129b442 en seomos.cloud; healthy.
- [x] Verificar migraciones y rutas protegidas/mocks cerrados en producción.
- [x] Autorizar exclusivamente 179.197.226.44 en Brevo tras confirmación; bloqueo API continúa activo.
- [x] Guardar la clave cifrada directamente en CRM; cuenta ceo@seomos.com confirmada.
- [ ] Corregir eventos del registro webhook (`reply`, sin `accepted`) según SDK oficial, verificar y publicar.
- [ ] Registrar y verificar el webhook real.
- [ ] Confirmar remitente aprobado y saldo; el actual sigue Draft y 0 créditos.
- [ ] Prueba real autorizada y evidencia; declarar bloqueos externos si existen.
