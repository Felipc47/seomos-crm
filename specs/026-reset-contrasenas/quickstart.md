# Quickstart de verificación: restablecimiento de contraseñas

## Preparación

1. Levantar PostgreSQL de pruebas en el puerto 5433 y aplicar migraciones.
2. Ejecutar Next en `http://localhost:3100` con `WA_MOCK_ENABLED=true`, Resend mock configurado y `APP_BASE_URL` apuntando al mismo origen.
3. Limpiar el buzón mediante el endpoint dev, disponible solo fuera de producción.

## Camino feliz — recuperación propia

1. Crear un admin y mantener una sesión previa abierta.
2. Desde `/login`, abrir “Olvidé mi contraseña”, solicitar el correo y observar la confirmación neutra.
3. Abrir el enlace capturado por el mock, definir y confirmar una contraseña nueva.
4. Confirmar que la contraseña anterior falla, la nueva entra y la sesión previa fue revocada.
5. Volver a abrir el mismo enlace y confirmar el estado inválido/usado.

## Camino feliz — integrante del equipo

1. Crear un integrante y entrar como admin a `/settings/team`.
2. Pulsar “Restablecer contraseña” en su fila y comprobar la confirmación sin token ni contraseña.
3. Abrir el correo del integrante, definir su contraseña y verificar que solo la nueva funciona.

## Seguridad y aislamiento

1. Solicitar recuperación para un correo inexistente: misma confirmación y ningún email.
2. Superar el límite público con un correo inexistente: obtener 429 sin entrega ni datos de cuenta.
3. Como usuario no admin, llamar la acción de equipo: 403 y ningún email.
4. Como admin, usar el ID de un miembro de otra organización: 404 y ningún email.
5. Enviar un token alterado: no cambia la contraseña.

## Camino infeliz

1. Forzar HTTP 500 en el mock de Resend.
2. Desde equipo, iniciar el restablecimiento: mensaje accionable en menos de 10 segundos, sin falsa confirmación ni cambio de contraseña.
3. Forzar otro fallo y solicitar desde la pantalla pública: confirmación neutra en menos de 10 segundos, sin revelar existencia ni colgarse.

## Gate final

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
bash tests/e2e/us34-password-reset.sh
```
