# Estado de despliegue — servicio por fuente Sheets

**Fecha**: 2026-11-12
**Estado**: bloqueado por aprobación automática; NO desplegado ni configurado.

## Versión preparada
- PR #18 integrado: https://github.com/Felipc47/seomos-crm/pull/18
- Commit aprobado técnicamente: `13066e2a5b7ef5d9b9365a53e787038e64793181`.
- Árbol verificado: `680f8e87f35205f89e9e638633130f2b441433d5`, igual al probado.
- El orquestador reporta typecheck, lint, build y 630 pruebas verdes; E2E de esta ampliación 33/33 y regresión de sincronización 37/37.
- Migración preparada: 0039, aditiva. No aplicada en producción.

## Producción preservada
- Producción permanece saludable en `a53b539c7e75617e2b71451b0ec163e191412601`.
- No se cambió el commit fijado en Coolify, no se disparó despliegue y no se modificó la configuración de las fuentes.
- No se modificaron registros históricos, cron, entorno, contactos, oportunidades, cuentas ni sesiones.
- No se enviaron mensajes ni correos de prueba, ni se reintentaron los mensajes fallidos anteriores.

## Comprobaciones de solo lectura
- Meta confirmó en vivo que las dos plantillas de bienvenida de Lion Data siguen APPROVED, categoría MARKETING e idioma en_US.
- Correspondencia de servicios confirmada: Integration Assessment → ERP & Ecommerce Integration; Ecommerce Assessment → Ecommerce Development & Optimization.
- Avisos de nuevos leads activos y Resend configurado. Credenciales de Meta/Google y entorno iguales a la referencia previa.
- Los cuatro crons permanecen activos, con sus frecuencias conservadas y sin fallos consecutivos en la revisión.
- Referencia previa: tres contactos, tres oportunidades, tres conversaciones y tres filas históricas de Sheets; tres mensajes salientes ya fallidos, dos correos de nuevo lead y doce resúmenes enviados.
- Los tres fallos previos tienen diagnósticos relacionados con marketing, sin código numérico identificable en la extracción permitida. La causa específica no quedó verificada. No se afirma que una plantilla aprobada garantice entrega.

## Bloqueo
La revisión automática rechazó la operación que fijaría el nuevo commit de producción. Motivo: no encontró autorización explícita del usuario para esa modificación exacta de configuración, aunque reconoció que era acotada y reversible. La operación fue rechazada antes de ejecutarse y no se intentó por otra vía.

El orquestador solicitó autorización explícita al usuario. Hasta recibirla quedan pendientes el despliegue, la vinculación de servicio de las dos fuentes y la verificación de ciclos naturales sin acciones retroactivas. La tarea no está marcada como completada.

La evidencia operativa acotada permanece en `.artifacts/sheets-flow-ops/`, ignorado por Git. Este documento no incluye enlaces de leads, datos personales, identificadores privados, secretos ni sus huellas.
