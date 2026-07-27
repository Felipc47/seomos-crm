# US24 — Edición unificada del prospecto

## Objetivo

Validar que Bandeja, Etapas del prospecto y Contactos usan el mismo editor para
nombre, WhatsApp, correo, notas y etapa, y que el servidor guarda contacto +
lead atómicamente sin perder historial ni estados protegidos.

## Cómo correrlo

Con PostgreSQL local en `:5433` y la aplicación en `http://localhost:3000` con
mocks internos:

```bash
bash tests/e2e/us24-edicion-prospecto.sh
```

El guion reinicia la base local de pruebas, registra una organización, carga la
demo y conduce Chrome con Playwright.

## Qué verifica

- Contrato visual idéntico desde Contactos, Pipeline y Bandeja.
- Edición conjunta de nombre, teléfono pegado con formato, correo, notas y etapa.
- Conservación de IDs, conversación, mensajes, ficha IA y consentimiento.
- Rechazo 409 de un teléfono duplicado sin cambios parciales.
- Motivo obligatorio para No calificado y persistencia del cierre.
- Fallo 500 con modal y valores escritos intactos.
- Cierre con Escape y ausencia de overflow a 375, 768 y 1440 px.
