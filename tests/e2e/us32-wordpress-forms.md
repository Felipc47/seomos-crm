# US32 — Formularios WordPress

## Objetivo observable

Un administrador crea una integración desde Ajustes, WordPress entrega un formulario autenticado y el prospecto aparece una sola vez en Bandeja, Pipeline y Contactos. El servicio, consentimiento, avisos y saludo siguen las reglas del CRM.

## Camino feliz

1. Crear empresa, conexión WhatsApp mock, servicio e integración.
2. Enviar JSON con ID, teléfono, nombre, email, consulta y consentimiento.
3. Comprobar ledger, contacto `web_form`, conversación, lead, servicio, aviso, email y SSE.
4. Repetir el mismo ID diez veces en concurrencia: cero duplicados de dominio/avisos/saludo.
5. Enviar aliases form-urlencoded y comprobar resultado equivalente.
6. Configurar saludo, enviar otro contacto con consentimiento y comprobar un único template en outbox.
7. Enviar sin consentimiento: el lead entra y el outbox no crece.

## Camino infeliz y seguridad

- secreto incorrecto, rotado, integración desactivada y empresa suspendida → mismo 401;
- body/tipo/teléfono inválido → 413/415/422 sin eco de valores;
- comercial → 403; otro tenant → listado vacío y recurso ajeno 404;
- fallo de WhatsApp/Resend → lead durable, respuesta acotada y cero secreto/payload crudo;
- segundo envío del mismo teléfono no pisa nombre/email humanos;
- UI responsive a 375/768/1440, revelado una vez, copia, rotación, consola limpia y sin overflow.
