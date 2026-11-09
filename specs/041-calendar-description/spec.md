# 041 — Descripción editable de la reunión

## Objetivo
El administrador de cada empresa puede editar en Ajustes → Calendario el texto que acompaña la invitación de Google Calendar y Google Meet.

## Comportamiento
- Campo multilinea «Descripción de la reunión», guardado por empresa con el resto de la agenda.
- Hasta 4000 caracteres; conserva saltos de línea y acepta texto vacío para omitir la descripción.
- Valor inicial compatible: `Agendada desde Seomos CRM para {{nombre}} ({{telefono}}).`.
- `{{nombre}}` y `{{telefono}}` se sustituyen por los datos del contacto al crear la reunión. El texto personalizado reemplaza por completo el texto anterior.
- Se aplica tanto al agendamiento manual como al del agente, exclusivamente para nuevas creaciones de eventos; no modifica reuniones existentes.
- Solo quien ya puede administrar la configuración de empresa puede guardar; ninguna empresa puede consultar o cambiar el texto de otra.
- Un guardado rechazado muestra un error y conserva el borrador editable.

## Alcance
Sin cambios de correo, destinatarios, conexión OAuth, disponibilidad ni confirmaciones del agente. Sin servicios, secretos o migraciones nuevos.

## Aceptación
Editar y recargar desde la interfaz conserva el valor. Un agendamiento por interfaz/canal genera en Google mock la descripción exacta. Validar límites, ausencia de configuración heredada, texto vacío, permisos y aislamiento. El fallo de Google degrada o devuelve un error honesto sin inventar una invitación.
