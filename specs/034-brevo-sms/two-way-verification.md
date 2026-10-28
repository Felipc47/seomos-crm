# Verificación del candidato — 2026-10-28 (Bogotá)

Implementado en `codex/brevo-two-way`, worktree aislado. No modifica el checkout
principal. La comparación con producción `b270485` conserva las funciones previas.

- Typecheck y lint: aprobados.
- Build: aprobado; una compilación final con el mock de timeout queda registrada
  en `/private/tmp/brevo-final-build.log`.
- Unitarios: **572/572 en 64 archivos**.
- E2E conexión: **35/35**.
- E2E envío/entrega/respuesta/contestación: **43/43**, incluidos timeout HTTP real
  de 12 segundos, formato inesperado, 503, auth, rate limit, rechazo, doble
  confirmación, callback temprano/repetido/fuera de orden, STOP, roles y cruce
  entre empresas conectadas y recuperación de intentos interrumpidos.
- Total funcional: **78 comprobaciones**. Datos ficticios y proveedores mock.
- Evidencia local: `.artifacts/sms/e2e.json`, `.artifacts/sms-two-way/result.json`,
  capturas desktop/móvil en ambos directorios.

## Cuenta real

Chrome corporativo `ceo@seomos.com`, verificado el 28 de octubre:
remitente US `TFN_PENDING_5` continúa **Draft** y SMS prepaid tiene **0 créditos**.
Se generó una clave restringida tras la confirmación expresa del dueño:
Account Read, Transactional SMS Read/write, Webhooks Read/write. Su valor no se
incluye en código, logs ni documentación. La pantalla de copia permanece abierta
hasta guardar la conexión cifrada directamente en el CRM.

La revisión automática rechazó un resguardo temporal alternativo de la clave;
no se insistió por otro canal. Se conserva el flujo de conexión directa al CRM.

La recepción real depende de aprobación del número y entrega de `replied` por
Brevo. Los mocks aprobados no sustituyen una prueba real. No se han comprado
créditos, presentado el Sender ID, importado contactos ni enviado SMS reales.

Fuentes oficiales revisadas:
https://developers.brevo.com/reference/send-async-transactional-sms
https://developers.brevo.com/reference/create-webhook
https://developers.brevo.com/docs/transactional-webhooks
https://help.brevo.com/hc/en-us/articles/29257056512274-Send-one-to-one-SMS-from-Brevo
