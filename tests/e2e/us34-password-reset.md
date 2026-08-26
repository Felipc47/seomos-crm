# US34 — Restablecimiento seguro de contraseñas

## Superficies ejercidas

- `/login` → enlace “Olvidé mi contraseña”.
- `/forgot-password` → solicitud pública neutra.
- Enlace real del correo mock → callback de Better Auth → `/reset-password`.
- `/settings/team` → acción administrativa por integrante.
- APIs de sesión, equipo, empresas y auth para comprobar efectos y permisos.

## Camino feliz

1. Crear admin e integrante y conservar una sesión anterior del admin.
2. Solicitar recuperación desde la UI móvil y abrir el enlace capturado por Resend mock.
3. Definir una contraseña nueva; confirmar que la anterior falla, la nueva entra y la sesión previa responde 401.
4. Reabrir el enlace consumido y observar “El enlace ya no es válido”.
5. Entrar como admin, pulsar “Restablecer” en la fila del integrante y comprobar que la UI no muestra token ni contraseña.
6. Abrir el correo del integrante y verificar el mismo cambio de credencial.

## Seguridad y aislamiento

- Correo inexistente: confirmación pública idéntica y buzón sin entrega.
- Once solicitudes desde la misma IP: las diez primeras pasan y la undécima responde 429.
- Integrante no admin: 403 al iniciar el proceso para otra persona.
- ID de miembro de otra organización: 404 y buzón sin cambio.
- Token alterado o ya consumido: rechazo sin cambio de credencial.
- Clave idempotente: no contiene el token crudo.

## Camino infeliz

- Forzar HTTP 500 en Resend mock desde la acción admin: 503 sanitizado en menos de 10 segundos, sin falsa entrega.
- Forzar HTTP 500 desde la solicitud pública: confirmación neutra en menos de 10 segundos, sin enumerar la cuenta.
- Tras ambos fallos, la contraseña vigente continúa permitiendo acceso al CRM.

## Ejecución

Con Next local en `http://localhost:3100`, PostgreSQL en `localhost:5433` y `RESEND_BASE_URL` apuntando al mock:

```bash
bash tests/e2e/us34-password-reset.sh
```

Resultado esperado: `38 verificaciones verdes`.
