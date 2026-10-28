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
- Modo producción local: **9/9**: health 200; endpoints SMS sin sesión 401;
  todos los mocks Brevo 404 aun con WA_MOCK_ENABLED=true; webhook ajeno 404.
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

## Publicación autorizada

El dueño autorizó expresamente subir a `Felipc47/seomos-crm`, integrar en main,
desplegar en seomos.cloud y conectar la credencial cifrada el 2026-10-28.
PR: https://github.com/Felipc47/seomos-crm/pull/8, integrada.
Candidato local: a22ec66. Merge publicado: 4129b4423ce7d6e880dfa7bb976eeeba2ac2b423.
Comparación de src/drizzle/paquetes del merge contra el candidato: idéntica.
Coolify fijado al merge publicado; despliegue ir079tk9wjv8hxi3lbfqptgj terminado (finished) el 2026-10-28T23:01:47Z.
Imagen anterior retenida: b2704859cd7208a1f8e086bb5ea9f3155987c1b2.

El conector no expone git_commit_sha: la fijación del único campo se realizó
mediante PATCH documentado de la misma instancia, conservando rama y configuración.
Una consulta de descubrimiento sin acción fue rechazada por la revisión automática
por ambigüedad; se leyó el contrato del conector antes de realizar el cambio exacto.

## Verificación en producción

- Migraciones aplicadas, Next Ready en 1432 ms y aplicación saludable.
- Health público 200; /api/settings/sms, /api/sms y /api/sms/send sin sesión 401.
- Los cuatro endpoints mock de Brevo probados devuelven 404 en producción.
- Navegador autenticado: Ajustes → SMS carga. Hubo un ChunkLoadError durante
  el cambio de contenedor; recargar resolvió la carga de recursos.
- Brevo rechazó la primera verificación de la clave. Se confirmó en Security →
  Authorized IPs que 179.197.226.44 (servidor CRM) está bloqueada, con uso del
  28 de octubre a las 18:02. Bloqueo del resto de IPs activo.
- Se solicitó autorización expresa para añadir exclusivamente esa IP; no se
  desactivó la protección ni se autorizó otro origen.

Punto de reanudación: la aprobación para autorizar la IP está pendiente. La clave
permanece en memoria de la sesión del navegador y en el campo de contraseña de la
conexión pendiente del CRM; nunca se imprimió ni se guardó en un temporal. No
reportar la cuenta como conectada ni el webhook como registrado hasta verificarlos.
