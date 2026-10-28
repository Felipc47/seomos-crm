# Plan

1. Opt-in OPENROUTER_REASONING_EFFORT validado por Zod; enviarlo solo al
   modelo principal foreground. Sin valor: conservar el request actual.
2. Registrar solo modelo/esfuerzo en el harness de pruebas interno para
   verificar el transporte real; sin mensajes ni credenciales en esa evidencia.
3. Probar payload, background y reintentos con unitarios y UI/canal con mocks.
4. Gate completo sobre main aislado; integrar y publicar el cambio autorizado.
5. Runtime: OPENROUTER_MODEL=gpt-6-luna, OPENROUTER_REASONING_EFFORT=xhigh,
   OPENROUTER_JUDGE_MODEL=gpt-5.6-luna (preserva perfilado anterior).
   Variables solo de producción y runtime, sin tocar scope preview.
6. Verificar la cuenta con solicitud sintética, el contenedor y una respuesta
   demo de producción, sin enviar mensajes a clientes.

No hay nuevas dependencias, migraciones ni credenciales. La variable opcional
está documentada en .env.example y como placeholder comentado en .env para
que el valor de ejemplo no invalide arranques locales.
