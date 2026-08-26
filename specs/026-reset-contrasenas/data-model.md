# Data Model: Restablecimiento seguro de contraseñas

No se crea ninguna tabla de dominio ni migración. Se reutilizan entidades de Better Auth y la membresía existente.

## `verification` (existente)

Autorización efímera de un restablecimiento.

| Campo lógico | Regla |
|---|---|
| `identifier` | `reset-password:<token aleatorio>`; único para localizar y consumir la solicitud |
| `value` | ID interno de la cuenta; nunca se envía al cliente |
| `expires_at` | Creación + 60 minutos |

El token aparece únicamente en el enlace destinado al correo de la persona. No se guarda en tablas de dominio, entregas ni logs.

## `account` (existente)

La cuenta `credential` conserva solo el hash de contraseña. Al completar un token válido se reemplaza el hash; la contraseña anterior no es recuperable.

## `session` (existente)

Todas las sesiones de la cuenta se eliminan después del cambio de contraseña. La persona debe autenticarse nuevamente con la contraseña nueva.

## `member` + `user` (existentes)

La acción administrativa une `member.user_id` con `user.id` y exige `member.organization_id` igual al tenant activo. De allí obtiene el correo de la persona sin aceptar un email controlado por el cliente.

## Transiciones

```text
sin solicitud ──solicitar──> token vigente
token vigente ──60 min──> vencido ──uso──> rechazado
token vigente ──consumo válido──> consumido + hash nuevo + sesiones revocadas
token consumido ──reuso──> rechazado
fallo de entrega ──> credenciales y sesiones sin cambio
```
