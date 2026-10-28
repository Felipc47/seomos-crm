# Estado de trabajo — Brevo SMS

Última actualización: 2026-10-26 (America/Bogota).
La conexión API está implementada y verificada localmente. Los envíos SMS
todavía no están implementados ni activos.

## Discover

- [x] Revisar constitución, convenciones y cambios previos del repositorio.
- [x] Revisar documentación oficial de registro, envío y eventos de Brevo.
- [x] Confirmar alcance: avisos y campañas SMS con consentimiento.
- [x] Confirmar remitente: Lion Data.
- [x] Confirmar preferencia de registro Google con `ceo@seomos.com`.
- [x] Preparar formulario en el perfil Google corporativo verificado.
- [x] Recibir confirmación en el momento de aceptar condiciones legales.
- [x] Completar y verificar cuenta: ceo@seomos.com, sesión abierta el 2026-10-26.
- [x] Titular completa la verificación de teléfono exigida antes de API keys/campañas.
- [x] Identificar empresa cliente y sitio web: https://www.liondata.com.co/.
- [x] Verificar la ficha de Lion Data en Empresas, sin leer conversaciones.
- [x] Revisar portada y formulario `/contactus/`: sin opt-in SMS visible.
- [x] Preparar borrador de consentimiento y ejemplos en lion-data-onboarding.md.

## Registro del remitente

- [ ] Recoger datos exactos del cliente y contacto autorizado.
- [ ] Validar páginas de privacidad/términos y mecanismo real de opt-in.
- [ ] Definir volumen y ejemplos de avisos y marketing.
- [ ] Presentar registro Sender ID/toll-free con los datos confirmados.
- [ ] Verificar aprobación externa; no marcar una solicitud como aprobada.

## Diseño e implementación

- [ ] Resolver la aclaración pendiente y cerrar la especificación.
- [x] Registrar Brevo SMS como proveedor opcional autorizado en las guías.
- [ ] Cerrar modelo, contratos y mecanismo de deduplicación/reconciliación.
- [ ] Crear adaptador Brevo y mocks sin envío real.
- [x] Implementar conexión cifrada y aislada por empresa; primera parte sin envíos.
- [ ] Implementar consentimiento/bajas SMS, validación US y ventanas horarias.
- [ ] Implementar avisos individuales y estado observable.
- [ ] Implementar campañas con revisión, outbox y procesamiento persistente.
- [ ] Implementar webhook autenticado, deduplicación y estados monotónicos.

## Verify

- [ ] Typecheck, lint, build y tests unitarios.
- [ ] E2E con mocks: cuenta conectada, consentimiento, aviso y campaña.
- [ ] E2E: baja, tenant ajeno, doble confirmación, callback duplicado/fuera de orden.
- [ ] E2E: timeout, formato inesperado, credencial inválida y falta de saldo.
- [ ] Configuración real y prueba con destinatario/costo autorizados.
- [ ] Resultado real de entrega observado y release verificado si aplica.

## Historial del bloqueo inicial — 2026-10-21

Formulario abierto en `https://onboarding.brevo.com/account/register`, perfil de
Chrome `seomos.com`. El dueño autorizó crear la cuenta con `ceo@seomos.com` y
aceptar las condiciones. El sitio no abre Google: mostró fallo de conexión con
reCAPTCHA y después un error genérico de registro, aun tras recargar. Se solicitó
al dueño completar ese paso manualmente, con la autorización existente.

La primera tentativa desde el perfil personal fue rechazada por revisión
automática; no produjo un registro. El perfil corporativo se verificó con
`ceo@seomos.com` antes de preparar el formulario allí. Una lectura amplia de la
bandeja también fue rechazada por revisión; se verificó Lion Data únicamente en
su ficha de Empresas mediante un selector acotado.

No se han comprado créditos, creado API keys, cargado contactos o enviado SMS.


## Estado inicial observado 2026-10-26 (superado: teléfono verificado)

Cuenta SEOMOS/ceo@seomos.com creada y sesión activa. SMS: 0 créditos.
Modal de teléfono abierto en perfil Chrome seomos.com; usuario avisado por pregunta
asíncrona. Wizard SMS en Waiting for log, todavía no activo para envíos verificados.

## Reanudación actual

Teléfono verificado. Remitente actual confirmado por el dueño: SEOMOS LLC. Buscar
datos del registro y páginas públicas, sin enviar formulario incompleto. Brevo
muestra 0 créditos y ninguna API key ni solicitud Sender ID. Se prepara conexión
cifrada con pruebas independientes; la activación real y los envíos siguen
pendientes de aprobación, credencial y prueba autorizada.

## Verificado en localhost — conexión (2026-10-26)

- Tipos y lint: aprobados. 559 tests unitarios / 63 archivos aprobados.
- Self-test UI con mocks: 35 comprobaciones aprobadas; evidencia `.artifacts/sms/`.
- El primer intento E2E detectó selector ambiguo (alerta de Next y alerta SMS);
  se acotó al módulo y se repitió todo el guion hasta verde.
- Migración 0034 en BD aislada seomos_sms_034; producción no modificada.
- Registro SEOMOS LLC: Articles y carta EIN encontrados, no copiamos el EIN a archivos.
- Consentimiento público actual es WhatsApp, no SMS. Ver seomos-onboarding.md.
- Generar clave y transmitir EIN: preguntas específicas de autorización pendientes.
- Avisos, campañas, aprobación regulatoria y prueba real siguen pendientes.

## Cierre de la primera parte

- [x] Build de producción, tipos, lint y 559 unit tests aprobados.
- [x] UI local: 35 comprobaciones y QA desktop/móvil aprobados.
- [x] Modo producción local: health 200, settings SMS sin sesión 401, mock 404
  incluso con WA_MOCK_ENABLED=true.
- [x] Migrador ejecutado dos veces en BD aislada, sin duplicar cambios.
- [x] Guardar el remitente SEOMOS LLC como borrador en Brevo: TFN_PENDING_5,
  estado Draft observado en el listado. No es una solicitud presentada/aprobada.
- [ ] Autorizar/generar clave y guardar conexión real por empresa.
- [ ] Autorizar introducir EIN en Brevo (carta IRS ya localizada).
- [ ] Concluir consentimiento y términos efectivos, avisos/campañas y pruebas
  correspondientes antes de habilitar envíos reales.
- [ ] Release de esta primera parte; no se modificó producción en este turno.
