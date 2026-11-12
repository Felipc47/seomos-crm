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
Pendiente publicar y verificar dos ciclos. Leer la hoja o compilar no significa conexión activa.
