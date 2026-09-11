# US15 — Reproducir notas de voz y ver imágenes al abrir el hilo

**Objetivo**: además de la transcripción (US13, que se mantiene), el operador
puede **escuchar** la nota de voz y **ver** la imagen del cliente. Las notas de
voz se descargan al reproducirse; las imágenes se previsualizan al abrir el
hilo.

## Guion automatizado

```bash
# Requiere `pnpm dev` corriendo con wa-mock y la BD local (:5433). Resetea la BD.
bash tests/e2e/us15-reproducir-media.sh
```

Cubre por API: `GET /api/conversations/{id}/messages/{msgId}/media` sirve los
bytes con su mime real (WAV/PNG de verdad en el mock), el DTO expone
`hasMedia`/`mediaMime`, y los caminos infelices — mensaje sin adjunto
(`no_media`), adjunto caducado en Meta (`media_unavailable`, degrada sin
colgarse), sin sesión (401), mensaje inexistente (404).

## Verificación manual en la UI (hilo de la bandeja)

1. Abre un hilo con nota de voz e imagen: la transcripción y el botón
   «Reproducir» están visibles; la imagen aparece directamente sin presionar
   «descargar».
2. Presiona «Reproducir» → aparece el reproductor nativo y suena la nota.
3. Una imagen se trae de Meta al renderizarse y se muestra con su pie de foto
   debajo.
4. Si Meta ya no conserva el adjunto (los guarda un tiempo limitado), el
   adjunto muestra «…ya no está disponible en WhatsApp» sin romper el hilo.

## Diseño

- El binario **nunca se persiste** en el servidor ni viaja en el DTO: se
  guarda solo el `media_id` (la URL firmada de Meta caduca; el id no) y el
  endpoint lo trae bajo demanda con el token de la organización
  (`fetchMedia`), con `Cache-Control: private` para no re-descargar al
  reabrir el hilo. Sin S3 ni servicios nuevos (constitución II).
