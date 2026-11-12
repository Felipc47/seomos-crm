# Verificación — 2026-11-12

## Candidato local
- Base: origin/main d4a28e5; worktree aislado en SSD. Checkout original conservado.
- Typecheck, lint y build de producción: verdes.
- Vitest: 70 archivos, 630 pruebas verdes (7 específicas de Sheets).
- Playwright: 37 controles verdes: UI, edición habitual de contacto importado, proveedor 403, cron/pausa/intervalo, fila nueva y refresco SSE, concurrencia, permisos, aislamiento, suspensión y ausencia de comunicaciones.
- Hashes antes/después de configuración de formularios y credenciales Calendar iguales.
- Notas, bajas, consentimiento y etapa de contacto preexistente preservados.
- Capturas desktop/móvil revisadas; sin desbordamiento. Evidencia local .artifacts/sheets-042/.
- El limitador de logins se activó al repetir pruebas; se reinició solo el servidor local y la última ejecución quedó verde. No se debilitó el limitador.
- Migración aplicada a base local dedicada: dos tablas nuevas e índices/FKs.

## Fuente real (solo lectura)
Adaptador verificado sin modificar permisos: Integration Assessment gid0, 2 filas válidas; Ecommerce Assessment gid1952065539, 1 válida; ninguna inválida. Campaña/formulario/respuestas caben en los límites existentes de notas.

## Producción
Desplegado merge a53b539c7e75617e2b71451b0ec163e191412601; árbol idéntico al candidato probado.
Health HTTPS 200; API de conexiones sin sesión 401; mock y cron sin autorización 404.
Primera importación real 11:36:43 America/Bogota: dos contactos nuevos y uno actualizado; tres contactos/oportunidades en total, sin filas inválidas.
Configuraciones/credenciales comparadas: 17 grupos idénticos; datos de configuración de cuatro empresas sin cambios. Conteos de otras empresas conservados.
Segundo ciclo automático natural observado 11:42:13–11:42:17 America/Bogota: dos fuentes completadas, cero fallos, cero contactos nuevos/actualizados y tres sin cambios. Sin adelantar reloj ni fechas y sin una segunda ejecución manual. Se mantienen tres contactos, tres oportunidades y una conversación.
El cron previo de seguimiento tuvo un fallo transitorio durante el cambio de contenedores; se recuperó por sí solo a las 11:40 y quedó con cero fallos consecutivos. Mailing y reuniones siguen activos. No se alteraron sus configuraciones.
Resultado: objetivo completo; ambas pestañas activas con intervalo de cinco minutos, no duplicación comprobada y resto de integraciones preservadas. Ver deployment.md para el registro operativo resumido.
