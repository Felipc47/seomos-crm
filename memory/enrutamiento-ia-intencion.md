# Enrutamiento IA exige intención explícita

La allowlist tenant-safe solo prueba que el `serviceId` existe; no prueba que el
cliente haya manifestado esa necesidad. Tanto el turno principal como la ficha
de lead deben enviar `serviceEvidence`, y `routeUnclassifiedLeadByService`
valida la evidencia antes de escribir.

- Rechazar saludo, nombre, cierre, descripción general del negocio y pedido
  genérico de información, aunque el proveedor devuelva un ID válido.
- La evidencia textual debe ser una cita de un mensaje entrante; nunca una
  sugerencia del negocio.
- Aceptar una necesidad concreta desde el primer mensaje o una respuesta
  concreta a una pregunta de calificación: no existe mínimo artificial de
  turnos.
- Audio usa su transcripción. La evidencia visual no citada solo es admisible
  durante el turno que contiene la imagen.
- US29 hace que el ai-mock produzca falsos positivos deliberados para comprobar
  que este guard permanece en el servidor y no depende de obediencia del LLM.
