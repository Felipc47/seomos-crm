# US31 — Sitio público y documentos legales para Google OAuth

## Objetivo

Comprobar como visitante anónimo que Seomos CRM ofrece una página principal pública,
una política de privacidad y términos accesibles, con una explicación verificable del
uso limitado de Google Calendar.

## Ejecución

Con el servidor local en el puerto 3000:

```bash
BASE_URL=http://localhost:3000 node tests/e2e/us31-public-legal.mjs
```

## Cobertura

- `/` responde 200 y no redirige al login.
- La landing explica disponibilidad, eventos, cifrado y límites de uso de datos de Google.
- La navegación abre `/privacy` y `/terms` sin sesión.
- La política explica datos de Google, revocación y eliminación.
- Los términos explican las integraciones externas.
- Vista móvil de 375 px sin desbordamiento y CTA de acceso visible.
- Una ruta legal inexistente conserva el 404.
- Consola y errores de página vacíos.
