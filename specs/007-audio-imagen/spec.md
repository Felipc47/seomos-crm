# 007 — El agente entiende audios e imágenes

## Objetivo

Hoy los mensajes de tipo `image`/`audio` se guardan con `text=null`: el agente
los ve vacíos y el operador solo ve un adjunto sin contenido. Esta feature hace
que el agente ENTIENDA una nota de voz (transcripción) y una imagen (visión),
reutilizando el proveedor de IA ya configurado.

## Decisiones del dueño (cerradas)

1. **Audio**: se transcribe SIEMPRE al ingerir, aunque el agente esté apagado, y
   la transcripción queda visible para el operador en la bandeja.
2. **Imágenes**: se pasan al modelo como contenido multimodal en el turno del
   agente.

## Requisitos funcionales

- **FR-301** Al ingerir un adjunto se guardan `message.media_id` y
  `message.media_mime`; el pie de foto de las imágenes va en `text`.
- **FR-302** Las notas de voz se transcriben al entrar con el endpoint de
  transcripción del MISMO proveedor (`OPENROUTER_TRANSCRIBE_MODEL`). La
  transcripción se guarda en `message.text` (el tipo sigue siendo `audio`), así
  que la bandeja, la ficha del lead y el historial del agente la aprovechan.
- **FR-303** La última imagen entrante viaja como contenido multimodal
  (`image_url` con data URI) al modelo de visión (`OPENROUTER_VISION_MODEL`, o
  `OPENROUTER_MODEL` si no se define). Solo la última: mandar el álbum entero en
  cada turno multiplicaría el coste sin aportar.
- **FR-304** La bandeja muestra las notas de voz como transcripción, con una
  marca visible de que es una nota de voz (no algo escrito).
- **FR-305** La descarga de media es de dos pasos (id → URL firmada → binario),
  bajo demanda por `media_id`, porque la URL de Meta caduca.

## Degradación (Definición de Hecho REFORZADA)

Ningún fallo del proveedor tumba el turno ni la ingesta:

- Sin `OPENROUTER_TRANSCRIBE_MODEL`, o si la transcripción falla → el mensaje
  queda con `[nota de voz — no se pudo transcribir]` y el flujo sigue.
- Si el modelo RECHAZA la imagen (no soporta visión, formato inválido) → el
  turno se **reintenta sin la imagen** con la etiqueta textual; NO se escala.
- Media inexistente o ilegible → se ignora el adjunto, el mensaje se registra.

## Soberanía (Constitución II)

No se introduce ningún proveedor nuevo: transcripción y visión usan el proveedor
LLM ya configurado (`OPENROUTER_BASE_URL` + `OPENROUTER_API_TOKEN`) y la descarga
usa la Cloud API de WhatsApp. Con OpenRouter, que no expone transcripción, basta
con dejar `OPENROUTER_TRANSCRIBE_MODEL` vacío.

## Criterios de aceptación (verificados en vivo)

`tests/e2e/us13-audio-imagen.sh` — 15 comprobaciones verdes: transcripción al
entrar y respuesta del agente a su contenido · imagen recibida de verdad por el
modelo · pie de foto guardado · proveedor de transcripción caído · modelo que
rechaza la imagen (no escala) · media inexistente · baja pedida por nota de voz
(006 + 007). Sin regresión en us9–us12.

## Extensión operativa — 2026-09-11

La operación reportó un fallo de entrega de una nota de voz saliente de Meta
(`131053`, error de carga multimedia) y pidió que las imágenes aparezcan sin
tener que presionar una descarga.

### User Story 1 — Enviar notas de voz interoperables (Priority: P1)

Como operador, quiero grabar y enviar una nota de voz desde la bandeja para que
el cliente la reciba sin depender de un formato ambiguo del navegador.

**Acceptance Scenarios**:

1. **Given** un navegador que permite AAC/MP4, **When** el operador graba una
   nota, **Then** la aplicación usa ese formato interoperable para WhatsApp.
2. **Given** un navegador sin AAC/MP4 pero con OGG/Opus, **When** el operador
   graba una nota, **Then** la aplicación usa OGG/Opus como alternativa.
3. **Given** un MIME con parámetros de códec, **When** se sube el adjunto,
   **Then** Meta recibe el MIME canónico permitido y la burbuja conserva el
   tipo correcto para poder reproducirlo.

### User Story 2 — Ver imágenes automáticamente (Priority: P2)

Como operador, quiero que una imagen disponible se previsualice al abrir el
hilo para entender el mensaje sin una descarga manual.

**Acceptance Scenarios**:

1. **Given** una imagen con adjunto disponible, **When** se renderiza el
   hilo, **Then** la imagen se solicita y se muestra automáticamente.
2. **Given** que Meta ya no conserva la imagen, **When** falla la carga,
   **Then** el hilo sigue operativo y explica que el adjunto no está
   disponible.

### Requisitos incrementales

- **FR-306** La selección de formato de `MediaRecorder` DEBE priorizar AAC/MP4
  y usar OGG/Opus únicamente como alternativa compatible.
- **FR-307** Antes de la carga, el MIME de un adjunto DEBE normalizarse a su
  tipo canónico permitido; no se enviarán parámetros de códec como el valor
  del campo `type` de Meta.
- **FR-308** Toda imagen o sticker con adjunto disponible DEBE previsualizarse
  automáticamente en el hilo; su fallo DEBE degradar a un estado visible, sin
  romper mensajes posteriores.
- **FR-309** La grabación MP4 DEBE finalizarse como un único contenedor al
  detener `MediaRecorder`; no se concatenarán fragmentos temporizados porque
  Chromium genera un archivo reproducible localmente pero con duración/índice
  truncados que Meta rechaza después con `131053`.

### Límites y supuestos

- No se guarda el binario de una nota ni de una imagen: la previsualización
  mantiene la descarga autenticada desde la Cloud API de WhatsApp.
- El error histórico `131053` llega de forma asíncrona desde Meta. El sistema
  evita los MIME ambiguos y los contenedores MP4 fragmentados que lo pueden
  provocar, pero no puede reintentar un audio cuyo binario Meta ya rechazó sin
  guardar archivos localmente.
