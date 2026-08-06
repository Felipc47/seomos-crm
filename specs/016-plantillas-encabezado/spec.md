# 016 — Plantillas con encabezado multimedia

## Objetivo
Que una plantilla de WhatsApp del CRM pueda llevar un **encabezado de imagen o
documento** (uno u otro, opcional) y que ese encabezado viaje en cada envío:
campañas de envío masivo, saludo de leads y envío manual desde la bandeja.

## Alcance (v1)
- **Imagen**: JPG/PNG, máx. 5 MB (límite de Meta).
- **Documento**: solo PDF, máx. 16 MB (tope operativo de la instancia,
  `WA_MEDIA_MAX_BYTES`).
- El encabezado se define **al crear** la plantilla. Al editar, si la
  plantilla tiene encabezado se puede **reemplazar el archivo** (mismo tipo);
  no se puede agregar/quitar el encabezado después de creada.
- El archivo fuente vive en Postgres (`template_media`, bytea) — soberanía:
  sin S3. Meta solo recibe copias: el ejemplo para aprobación (Resumable
  Upload API → `header_handle`) y el media de envío (`/media` → `media_id`,
  caduca ~30 días; se re-sube solo cuando está viejo).
- El mensaje saliente en el hilo muestra el adjunto del encabezado.

## Fuera de alcance
- Video en encabezado, pie de plantilla, botones, variables en el encabezado.
- Importar desde Meta plantillas con encabezado creadas por fuera (el sync
  sigue sin importar plantillas externas — gotcha conocido).

## Criterios de aceptación
1. Crear plantilla con imagen o PDF → llega a Meta con componente HEADER y
   ejemplo (`header_handle`); queda `pending` y al aprobarse es utilizable.
2. Flujo comercial (`awaiting_approval`) intacto: el archivo queda local y
   viaja a Meta recién cuando el admin aprueba.
3. Campaña con plantilla con encabezado → cada destinatario recibe el
   mensaje con el componente `header` (media id), reutilizando UN solo
   `media_id` para toda la campaña.
4. Media id caducado (>25 días) → se re-sube desde `template_media` sin
   intervención del operador.
5. Camino infeliz: (a) archivo no permitido/oversize → 422 claro sin tocar
   Meta; (b) Meta rechaza el alta sin `header_handle` → error legible;
   (c) fallo del canal a mitad de campaña → se pausa y notifica (015).
6. El hilo de la conversación muestra la imagen/documento del encabezado en
   el mensaje de plantilla enviado.
