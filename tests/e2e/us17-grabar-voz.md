# US17 — Grabar notas de voz desde el composer

**Objetivo**: el operador graba una nota de voz en la bandeja y la envía por
WhatsApp, con vista previa antes de enviar.

## Cómo funciona

- Botón de micrófono junto al clip (solo con la ventana de 24 h abierta, como
  todo texto libre). Al grabar: barra con timer, «Cancelar» (descarta) y
  «Detener» (pasa al chip con reproductor de vista previa). Tope: 5 min.
- El formato de captura lo decide el navegador con `MediaRecorder`: Firefox
  graba `audio/ogg` (Opus), mientras Chrome 126+ y Safari graban `audio/mp4`
  (AAC). Navegador sin soporte → mensaje claro.
- Antes de contactar a Meta, el servidor normaliza a `audio/ogg` con códec
  Opus cualquier audio que el composer presenta como nota de voz y lo envía
  con `voice=true`. FFmpeg corre dentro del mismo contenedor, con temporales,
  tiempo y tamaño acotados.
- Los audios no llevan pie en WhatsApp: si había texto escrito, sale como
  mensaje aparte inmediatamente después de la nota.
- El envío reutiliza el pipeline de adjuntos (US16): sube a Meta, guarda el
  `media_id` y la nota enviada se re-reproduce desde el hilo bajo demanda.

## Self-test (Playwright, mic falso de Chromium)

`tests/e2e/us36-audio-container.mjs` usa el micrófono falso de Chromium y
verifica el flujo desde el botón de grabar hasta el binario que recibe el mock
de Meta. Además inspecciona ese binario con `ffprobe`: MIME `audio/mp4`, códec
AAC, contenedor MP4 válido y duración completa. Esta última aserción protege la
regresión `131053`: con `MediaRecorder.start(250)`, Chromium producía varios
segmentos que al concatenarse reportaban solo la duración del primer fragmento.

## Verificación manual

1. Abre un hilo con ventana abierta → presiona el micrófono → habla → «Detener».
2. Escucha la vista previa en el chip; «X» la descarta.
3. Envía: la burbuja muestra «Nota de voz» con «Reproducir».
4. Niega el permiso del micrófono en el navegador → mensaje claro sin colgarse.
