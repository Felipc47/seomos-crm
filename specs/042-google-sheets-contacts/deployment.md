# Despliegue de Google Sheets — 2026-11-12

Estado: desplegado, conectado y verificado en producción.

## Candidato y gates
- PR #17: https://github.com/Felipc47/seomos-crm/pull/17
- Main aprobado: `a53b539c7e75617e2b71451b0ec163e191412601`.
- Head probado: `8aea07e0a45b461f840b39a0460e642182af7184`.
- Árbol idéntico entre el head probado y el merge.
- Typecheck, lint, build, 630 pruebas en 70 archivos y Playwright 37 controles verdes, verificados por el orquestador.

## Estado inicial
CRM saludable y health HTTPS 200. Migraciones al arrancar mediante `node migrate.mjs && node server.js`.
Lion Data tenía 1 contacto, 1 oportunidad y 1 conversación.
Las tareas existentes de seguimiento, mailing y reuniones estaban activas, sin fallos consecutivos.
Ambas pestañas respondían con CSV legible desde el contenedor de producción.

## Verificaciones de producción
- Despliegue completado el 12 de noviembre a las 11:35:27, America/Bogota.
- Migración aditiva 0038 aplicada al arranque; contenedor healthy y cero reinicios.
- Health HTTPS: 200 y `{"ok":true}`. API de configuración sin sesión: 401; mock de Sheets y cron sin autorización: 404.
- Entorno de credenciales idéntico a la referencia previa. Los 17 grupos de configuraciones/integraciones comparados y las configuraciones de las cuatro empresas permanecen iguales.
- Dos conexiones de Lion Data activas con intervalo de 5 minutos: Integration Assessment y Ecommerce Assessment.
- Nueva tarea independiente revisa fuentes vencidas cada minuto. No se modificaron las tareas anteriores.
- Primera sincronización a las 11:36:43: Integration Assessment creó 1 contacto y actualizó 1 existente; Ecommerce Assessment creó 1. Total: 2 nuevos, 1 actualizado, cero omitidos o errores.
- Lion Data: 3 contactos, 3 oportunidades y la conversación anterior conservada. Los conteos de las demás empresas permanecen iguales.
- Las 3 filas vinculadas tienen nombre, correo y notas de campaña/origen. No se otorgó consentimiento de marketing ni se enviaron mensajes por la importación.
- Durante el rolling update una ejecución del barrido anterior falló porque coexistían temporalmente dos contenedores; se recuperó sola en su ejecución natural de las 11:40, sin cambiar configuración y con cero fallos consecutivos después.
- Segundo ciclo automático natural: 11:42:13–11:42:17. El cron procesó ambas fuentes con éxito; Integration Assessment tuvo 2 filas sin cambios y Ecommerce Assessment 1. Cero contactos nuevos, actualizados, omitidos o errores. El total quedó en 3 contactos / 3 oportunidades / 1 conversación, sin duplicados.
- No se adelantó el reloj, no se modificaron las fechas de vencimiento y no se forzó una segunda sincronización manual. La ejecución previa de las 11:41 no procesó las fuentes aún no vencidas, confirmando que se respeta el intervalo.
- El cron de Sheets quedó activo cada minuto y con cero fallos consecutivos. Las tareas anteriores de seguimiento, mailing y reuniones permanecen activas y operativas.

La evidencia operativa detallada se guarda localmente en `.artifacts/sheets-ops/`, ignorado por Git. Este documento no incluye datos personales, enlaces a fuentes de leads, secretos ni sus huellas.
