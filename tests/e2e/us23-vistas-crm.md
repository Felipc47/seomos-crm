# US23 — Vistas alternativas de pipeline y contactos

## Objetivo

Validar en navegador real que Etapas del prospecto alterna Tablero/Lista y
Contactos alterna Lista/Cuadrícula, conservando filtros, acciones, reglas de
movimiento, accesibilidad, responsive y preferencia local.

## Cómo correrlo

Con PostgreSQL local en `:5433` y el servidor en `http://localhost:3000` usando
los mocks internos:

```bash
bash tests/e2e/us23-vistas-crm.sh
```

El guion reinicia la base local de pruebas, registra una organización, carga la
demo y conduce Chrome con Playwright.

## Qué verifica

- Defaults Tablero y Lista.
- Equivalencia de búsqueda al alternar vistas.
- Lista del pipeline con ocho leads y cambio normal de etapa.
- Cierre negativo cancelado y confirmado con motivo.
- Fallo del PATCH que restaura la etapa y muestra aviso.
- Cuadrícula con ocho contactos y acciones de detalle, edición, chat, archivo y
  eliminación.
- Conservación de búsqueda y filtro por etapa.
- Preferencias independientes tras recarga y fallback ante valor inválido.
- Selectores activables por teclado con `aria-pressed`.
- Ausencia de overflow horizontal en las vistas nuevas a 375, 768 y 1440 px.
