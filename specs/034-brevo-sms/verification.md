# Verificación — conexión Brevo SMS, 2026-10-26

Alcance: primera parte de 034, conexión por organización; no envío de SMS.

- Typecheck y lint completos: exit 0.
- Build Next 15: exit 0.
- Vitest: 63 archivos y 559 pruebas aprobados, un worker para no agotar recursos.
- Self-test Playwright sobre localhost: 35 comprobaciones, resultado
  `.artifacts/sms/e2e.json`; captura desktop y móvil inspeccionadas visualmente.
- Feliz: registro/login, conectar, comprobar cuenta/saldo, limpiar clave, recargar,
  consultar otra vez y desconectar con eliminación del secreto cifrado.
- Infeliz: key inválida, rate limit, caída y formato inválido: error observable,
  sin colgar UI ni reemplazar conexión anterior, sin reflejar cuerpos/claves.
- Privacidad: proyección excluye marketingAutomation.key del proveedor;
  credencial cifrada AES-GCM, no completa en API o después de recargar.
- Seguridad: empresa B no lee/actualiza/elimina A; rol comercial recibe 403;
  sin sesión 401; no acepta organizationId del cliente; no existe /api/sms/send.
- Producción local con WA_MOCK_ENABLED=true: /api/dev/brevo-mock/account 404,
  /api/settings/sms 401 y /api/health 200. Evidencia production-mode.json.
- Migración 0034 aplicada dos veces mediante migrador, sin duplicación.

El primer guion falló por selector ambiguo getByRole(alert), que también alcanzó
el route announcer de Next. Se corrigió el selector dentro de la sección SMS y se
repitió el guion completo hasta verde. No se modificaron funcionalidades ajenas.

## Estado externo comprobado

- Cuenta Brevo ceo@seomos.com activa y teléfono verificado por el titular.
- 0 créditos SMS observados. Ninguna API key generada.
- Borrador TFN_PENDING_5 guardado para Estados Unidos, estado Draft visible.
- Datos empresariales contrastados con Articles y sitio corporativo. Carta IRS
  encontrada, pero EIN no introducido ni copiado al repositorio.
- Consentimiento del sitio menciona WhatsApp. Los borradores SMS no están publicados.
- Clave de solo Account Read preparada en UI; confirmación pendiente por crear
  acceso persistente. El uso del EIN en Brevo también se consultó al titular.

La integración de envíos NO está activa. Faltan consentimiento/bajas efectivos,
avisos/campañas, aprobación de número y prueba real con costo/destinatario
explícitos. Esta verificación local no acredita entregas reales ni producción.
