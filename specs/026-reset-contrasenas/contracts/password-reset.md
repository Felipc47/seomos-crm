# Contracts: restablecimiento de contraseña

## Solicitud pública — Better Auth

`POST /api/auth/request-password-reset`

```json
{
  "email": "persona@example.com",
  "redirectTo": "/reset-password"
}
```

- Cuenta existente, inexistente o fallo de entrega: respuesta pública neutra que no confirma existencia.
- Email con sintaxis inválida: 400.
- Exceso de solicitudes: 429 con mensaje genérico.
- Nunca devuelve token, enlace, usuario ni detalle del proveedor.

## Callback del enlace — Better Auth

`GET /api/auth/reset-password/{token}?callbackURL=/reset-password`

- Token vigente: redirige a `/reset-password?token=<token>`.
- Token ausente, vencido, alterado o consumido: redirige a `/reset-password?error=INVALID_TOKEN`.
- Solo acepta callback de la propia instancia.

## Definir contraseña — Better Auth

`POST /api/auth/reset-password`

```json
{
  "token": "token-recibido",
  "newPassword": "NuevaClaveSegura"
}
```

- Éxito: 200 `{ "status": true }`; consume el token, reemplaza el hash y revoca sesiones.
- Token inválido/usado/vencido: 400 genérico, sin cambio.
- Contraseña menor de 8 o mayor de 128 caracteres: 400, sin cambio.

## Solicitud iniciada por admin

`POST /api/settings/team/{memberId}/password-reset`

- 200 `{ "ok": true }`: entrega aceptada para el correo del miembro.
- 401: sin sesión.
- 403: el solicitante no es admin.
- 404: el miembro no pertenece al tenant activo; no revela una cuenta ajena.
- 429: exceso de solicitudes para ese admin y miembro.
- 503: Resend no está configurado o falló; credenciales sin cambio.
- Nunca devuelve email, token, enlace o detalle del proveedor.

## Entrega Resend

`POST {RESEND_BASE_URL}/emails` mediante el adaptador existente.

- Destinatario: correo de la cuenta resuelto en servidor.
- Contenido: texto y HTML equivalentes; enlace completo solo dentro del correo.
- `Idempotency-Key`: hash irreversible del token, menor de 256 caracteres.
- Timeout: 8 segundos.
- Logs: solo categoría y error sanitizado; sin correo, token ni URL.
