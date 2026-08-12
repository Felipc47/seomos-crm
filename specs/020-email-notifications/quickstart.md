# Quickstart de verificación: notificaciones por email

## Preparación

1. Levantar PostgreSQL de pruebas y aplicar migraciones.
2. Ejecutar Next con `WA_MOCK_ENABLED=true`, `RESEND_API_KEY=re_test`, `RESEND_FROM_EMAIL=notificaciones@example.test` y `RESEND_BASE_URL=http://localhost:3000/api/dev/resend-mock`.
3. Configurar `AGENT_SWEEP_SECRET` y conservar Resend real deshabilitado.

## Camino feliz

1. Crear una empresa con owner y un comercial.
2. Crear un lead nuevo: comprobar un email al owner con nombre y enlace.
3. Asignarlo al comercial: comprobar un único email adicional al comercial.
4. Repetir el evento y la asignación: comprobar que el buzón no crece.
5. Crear un segundo lead asignado y mover estados para obtener un panorama variado.
6. Ejecutar `/api/cron/sweep?now=<lunes-siguiente>` tres veces.
7. Comprobar un resumen personal del comercial y un panorama del owner, sin duplicados y con totales exactos.

## Aislamiento

1. Crear otra empresa y un lead en ella.
2. Ejecutar el barrido.
3. Confirmar que ningún correo de la primera empresa contiene el lead, usuario o métricas de la segunda.

## Camino infeliz

1. Forzar HTTP 500 en el mock y crear otro lead.
2. Confirmar que el lead permanece en el pipeline y la entrega queda `failed` sin secreto ni respuesta cruda.
3. Reiniciar sin `RESEND_API_KEY`/`RESEND_FROM_EMAIL` y crear un lead/ejecutar barrido.
4. Confirmar que ambos flujos terminan normalmente, no se intenta correo y las notificaciones internas siguen operativas.

## Gate final

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
bash tests/e2e/us30-email-notifications.sh
```
