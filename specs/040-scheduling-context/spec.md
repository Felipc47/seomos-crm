# 040 — Confirmación contextual de reuniones

Bug: después de ofrecer jueves por la tarde y viernes a las 10 am, «Friday» selecciona una sola opción. Una confirmación posterior «Yes» debe registrar esa misma cita; no reiniciar los horarios ni cambiar a español.

## Aceptación
- Elegir un día con una sola opción concreta basta; «yes/sí/ok» confirma una única fecha/hora en la propuesta inmediatamente anterior.
- El datetime ejecutado coincide con esa propuesta en la zona de la empresa. Varias opciones del mismo día, rechazo, pregunta, cambio de tema, fecha distinta y una aceptación histórica no autorizan reservar.
- Se mantienen correo, antelación, jornada, conflicto real, sandbox y protección contra duplicados.
- Todos los textos del servidor en este flujo respetan español/inglés o el idioma reciente en modo bilingüe, incluidas fechas, errores y éxito.
- Self-test con WhatsApp/LLM/Google simulados, resultado visible en chat y reunión; gate técnico completo. Sin mensajes reales ni gasto de proveedor.

Alcance: corrección sobre 004/031. Sin migraciones ni dependencias nuevas. Publicación se distingue de la verificación local.
