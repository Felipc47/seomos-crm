# Quickstart: verificar formularios WordPress

## Preparación

1. Arrancar PostgreSQL local en `localhost:5433`, aplicar migraciones y levantar la app en `http://localhost:3100` con los mocks oficiales.
2. Crear un administrador, empresa, conexión WhatsApp mock, plantilla aprobada, servicio y responsable.
3. En Ajustes → Integraciones → Formularios web, crear `Formulario SEO`, vincularlo al servicio y copiar endpoint/secreto.

## Camino feliz por API pública

```bash
curl -i -X POST "$ENDPOINT" \
  -H "authorization: Bearer $FORM_SECRET" \
  -H 'content-type: application/json' \
  --data '{
    "externalId":"wordpress-e2e-001",
    "phone":"+57 300 123 4567",
    "name":"Ana Web",
    "email":"ana@example.com",
    "message":"Quiero una propuesta de SEO",
    "source":"WordPress",
    "campaign":"organic",
    "pageUrl":"https://example.com/seo",
    "consent":true
  }'
```

Comprobar desde la UI real:

- Bandeja muestra `Ana Web` y la conversación.
- Pipeline y Contactos muestran un único prospecto con servicio SEO.
- La nota conserva procedencia/campaña/consulta sanitizadas.
- La notificación/email y el outbox WhatsApp mock contienen como máximo un efecto.
- SSE actualiza la vista abierta sin recarga.

Repetir diez veces, incluyendo concurrencia, con `wordpress-e2e-001`: todas las respuestas son `duplicate` después del ganador y no crece ningún contador de efectos.

## Formulario codificado

Enviar otro ID con `application/x-www-form-urlencoded` y aliases `submission_id`, `your-phone`, `your-name`, `your-email`, `your-message`, `utm_campaign`, `acceptance`; debe producir el mismo resultado.

## Camino infeliz

- Secreto incorrecto, integración desactivada y empresa suspendida: mismo `401`, sin efectos ni fuga de existencia.
- Body mayor a 32 KiB: `413`; content-type ajeno: `415`; teléfono/ID ausente: `422`.
- Rotar secreto: anterior `401`, nuevo `201`.
- Enviar sin `consent`: lead presente y cero WhatsApp saliente.
- Contacto bloqueado/dado de baja con `consent=true`: lead actualizado y cero WhatsApp saliente.
- Preparar fallo de WhatsApp y Resend: la solicitud conserva contacto/lead y termina; el diagnóstico visible no contiene respuestas crudas ni secretos.
- Intentar CRUD como comercial y desde otra empresa: `403`/`404`, sin datos cruzados.

## WordPress

Validar las recetas visibles en la pantalla con los payloads exportados de Contact Form 7, Elementor Forms y WPForms. Cada adaptador debe conservar un UUID por entrega/reintento y mapear solo los campos canónicos.

## Gate final

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
bash tests/e2e/us32-wordpress-forms.sh
```

Revisar en navegador a 375, 768 y 1440 px: creación, revelado una vez, copia, rotación, estados de error, consola limpia y ausencia de overflow horizontal.
