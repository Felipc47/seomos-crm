# Agente SMS automático — E2E con mocks

Usar PostgreSQL QA en `127.0.0.1:5433/seomos_sms_034`, aplicar migraciones y arrancar
`node tests/e2e/sms-connection-start.mjs` en el puerto 3110. Ejecutar
`node tests/e2e/sms-agent.mjs`. Requiere el usuario ficticio
`sms034@test.local` creado por el flujo SMS previo.

La prueba usa exclusivamente los mocks internos de Brevo y OpenRouter; nunca
consume créditos ni envía SMS reales. Reinicia el servidor QA si el límite de
intentos de login se activa por ejecuciones repetidas.

El recorrido abre Bandeja como usuario, comprueba IA apagada inicialmente,
activa el interruptor, recibe una respuesta SMS vía webhook autenticado y observa
la respuesta del agente en el hilo. Luego comprueba deduplicación y barrido,
interrupción por respuesta manual, silencio, error incierto de Brevo, solicitud
de humano, salida larga/inválida del modelo, saldo IA cero, permisos, tenant,
STOP y disposición móvil.

Evidencia: `.artifacts/sms-agent/result.json`, `desktop.png`, `mobile.png`.
