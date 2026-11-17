# 044 — Alta SMS automática desde Meta y Google Sheets

Fecha: 2026-11-16. El dueño confirma que el formulario de Meta incluye aceptación expresa de SMS y que las dos pestañas conectadas contienen exclusivamente leads de ese formulario.

## Resultado esperado
- Un nuevo lead de un formulario Meta o una pestaña Sheets autorizada se crea en Contactos y también en la bandeja SMS, sin alta manual por lead.
- El administrador registra una vez por formulario/pestaña el texto o referencia verificable de opt-in SMS. No se concede consentimiento a otras fuentes ni a filas anteriores a la activación.
- Cada SMS contactado conserva la evidencia: tipo e ID de fuente, ID de lead y la declaración del administrador.
- Solo números válidos de Estados Unidos se inscriben en SMS; los demás siguen su flujo de contacto/WhatsApp.
- La baja SMS, el bloqueo, el archivo y la baja del contacto CRM no se revocan por sincronizaciones o eventos repetidos.
- La inscripción nunca envía un SMS por sí sola; el remitente aprobado, webhook y saldo siguen siendo requisitos para el envío.
- La empresa B no puede activar una fuente ni enviar a un contacto de A.

## Flujos
1. Admin activa un formulario Meta detectado y una pestaña conectada desde Ajustes → SMS, consignando evidencia y confirmando opt-in.
2. Meta webhook crea contacto/conversación/lead, inscribe SMS si su formulario está autorizado y conserva el saludo WhatsApp existente.
3. Primera importación de fila Sheets inscribe SMS en la misma transacción que guarda la fila. Releer o editar la fila no reinscribe ni duplica.
4. Al desactivar una fuente, ningún lead nuevo de esa fuente se inscribe. Los registros previos y bajas permanecen.

## Dependencias
La publicación de 043 (flujo por servicio de Sheets) sigue pendiente en producción. 044 se basa en esa versión y no envía mensajes retroactivos al activarse.
