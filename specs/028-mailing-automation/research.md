# Decisiones — 2026-10-08

- Suscriptor independiente: `contact` del CRM exige teléfono; no reutilizarlo ni inferir permiso de email. Email normalizado único por empresa.
- Secuencia: días absolutos desde inscripción (7/14/21), lista como disparador; UNIQUE programa/suscriptor y un paso por suscriptor/ciclo. No depende de cierres de leads WhatsApp.
- Persistencia: outbox SQL, claim condicional y lease; runner existente WhatsApp solo tiene un Set in-process y no se copia ese mecanismo.
- Cron existente protegido permite reloj simulado solo en mocks. Mailing tiene endpoints autenticados que solo preparan trabajo; cron entrega sin navegador.
- Remitentes: un dominio por empresa y dirección de ese dominio; API key de instancia full access para gestionar dominios, sin exponerla a usuarios.
- DNS: mostrar exclusivamente registros reales retornados por [Create Domain](https://resend.com/docs/api-reference/domains/create-domain), consultar [Retrieve Domain](https://resend.com/docs/api-reference/domains/get-domain), iniciar [Verify Domain](https://resend.com/docs/api-reference/domains/verify-domain). No cambiar DNS del hosting automáticamente.
- [Idempotencia Resend](https://resend.com/docs/dashboard/emails/idempotency-keys): conserva claves 24h; reintentos locales de payload inmutable por menos de 23h, después marcar uncertain y reconciliar mediante eventos, nunca reenviar a ciegas.
- [Límites Resend](https://resend.com/docs/api-reference/rate-limit): limitar el agregado de empresas, respetar 429 y retry-after. No fijar cuotas comerciales en la UI.
- [Webhooks](https://resend.com/docs/webhooks/verify-webhooks-requests): firma sobre body crudo y ventana temporal; [eventos](https://resend.com/docs/webhooks/event-types) atribuidos desde providerMessageId local.
- Entorno comprobado: PostgreSQL Homebrew en 127.0.0.1:5433 y Chrome/Playwright disponible; crear BD separada y nunca resetear vocero/portal_seomos.
- Alternativas descartadas: Broadcasts/Automations del proveedor (estado fuera de self-host), SMTP nuevo (proveedor fuera de constitución), contact WhatsApp (requiere teléfono), HTML libre (superficie XSS innecesaria).

- Métricas opcionales por empresa: [Update Domain](https://resend.com/docs/api-reference/domains/update-domain) permite open_tracking/click_tracking; se muestran preferencias en remitente y solo eventos firmados alimentan los resultados.
- Tags de envío (mailing_org/mailing_send) permiten reconciliar callback adelantado a la persistencia del provider ID; eventos transaccionales ajenos se ignoran sin generar retries permanentes.
