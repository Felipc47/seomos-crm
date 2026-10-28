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
- [x] Verificar contrato SMS con API real: `accepted`, `reply`, `softBounce`, `hardBounce`, `unsubscribe` (singular); SDK general insuficiente.
- [x] Registrar webhook real: Brevo HTTP 201 y CRM confirma recepción configurada tras recarga.
- [ ] Bloqueo externo: remitente sigue Draft; la API no informa saldo SMS.
- [ ] Prueba real pendiente de remitente aprobado, créditos y autorización de destinatario/envío.
