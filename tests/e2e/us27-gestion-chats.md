# US27 — Gestión y moderación de chats

**Objetivo**: comprobar que Bandeja elimina chats sin borrar prospectos,
bloquea de forma real todos los caminos de salida, sincroniza con Meta con
degradación segura y registra reportes internos individuales o masivos.

## Ejecución

```bash
# Requiere la app local en :3000 con mocks internos y PostgreSQL en :5433.
# El guion reinicia la base de datos.
bash tests/e2e/us27-gestion-chats.sh
```

## Cobertura

- Eliminación individual y masiva; cancelación visual.
- Contacto y lead sobreviven; un nuevo entrante recrea el chat sin duplicarlos.
- Lotes vacíos/mayores de 100 e IDs de otra organización se rechazan.
- Bloqueo y desbloqueo en el endpoint oficial mock `block_users`.
- Fallo al bloquear mantiene protección local y deja sincronización fallida.
- Fallo al desbloquear mantiene el contacto bloqueado.
- Texto, archivo, plantilla, campaña, seguimiento y turno IA no escriben a
  bloqueados.
- Reporte interno conserva motivo, notas, actor y fecha; no bloquea por sí solo.
- Menú individual, modo selección, diálogos, indicadores y compositor
  bloqueado se ejercen con Playwright.
- Responsive a 375, 768 y 1440 px, teclado y consola sin errores.
