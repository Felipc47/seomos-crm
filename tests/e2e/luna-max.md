# Luna reciente con máximo razonamiento admitido

Entorno exclusivo local: seomos_luna_035 en PostgreSQL localhost:5433,
CRM localhost:3107 y WA/IA mocks. Los launchers contienen valores ficticios.

1. Aplicar migraciones con DATABASE_URL y MIGRATIONS_DIR explícitos.
2. node tests/e2e/luna-max-start.mjs
3. node tests/e2e/luna-max.mjs
4. Detener el servidor antes de otro build (mismo .next).

Verifica respuesta observable en Bandeja y demo, transporte modelo/esfuerzo,
perfilado anterior, JSON envuelto, caída persistente, recuperación y formato
inválido. El mock solo registra metadatos de modelo/esfuerzo, sin mensajes ni
credenciales. Resultado: 11 comprobaciones; evidencia en .artifacts/luna-max/.
