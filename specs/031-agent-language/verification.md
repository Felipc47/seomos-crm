# Evidencia

2026-10-12: checkout aislado basado en producción 7f2cce75f765dc70315dbc91a70508486ae38122. Migración 0030 generada con Drizzle y aplicada a seomos_language_031 en PostgreSQL local. Typecheck, ESLint y Next build exitosos; Vitest: 52 archivos / 424 tests verdes. Playwright US41: 26 comprobaciones verdes, incluyendo persistencia de los tres modos, mensajes visibles en bandeja, cambio bilingüe, JSON envuelto, input inválido, empresa B con español, proveedor caído → handoff error y móvil 390 px sin overflow.

Usados los ejecutables locales de los mismos scripts package.json porque pnpm intentaba descargar automáticamente su versión declarada y quedaba esperando red en sandbox. Sin cambios a package.json/lockfile. WA_MOCK_ENABLED=true; todos los mensajes a wa-mock/graph y todas las llamadas LLM a ai-mock/v1. La calidad del proveedor real no se prueba con mensajes reales en producción.

Producción: pendiente de publicación y smoke autenticado.
