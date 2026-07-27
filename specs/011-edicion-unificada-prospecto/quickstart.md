# Quickstart: Verificación de edición unificada

## Precondiciones

- PostgreSQL local de pruebas iniciado.
- Aplicación con mocks internos y organización demo.
- Dos contactos de la misma organización con teléfonos distintos.
- Sesión autenticada en navegador.

## Escenario 1 — Contrato común

1. Abrir un prospecto desde Contactos y activar Editar.
2. Confirmar nombre, WhatsApp, correo, notas y etapa.
3. Repetir desde una tarjeta/fila de Pipeline y desde el panel de Bandeja.
4. Confirmar el mismo título, campos, ayudas, validaciones y botones.

## Escenario 2 — Guardado completo

1. Desde Contactos, cambiar nombre, WhatsApp, correo, notas y etapa abierta.
2. Guardar y comprobar que la vista refleja los valores.
3. Abrir Pipeline y Bandeja; comprobar la misma identidad y etapa.
4. Verificar en base de datos que contacto y lead conservan sus IDs.
5. Confirmar que conversación y mensajes siguen asociados al contacto.

## Escenario 3 — Reglas y atomicidad

1. Intentar un WhatsApp corto y confirmar que Guardar está inactivo.
2. Usar el teléfono del segundo contacto y guardar.
3. Confirmar error de duplicado, modal abierto y cero cambios persistidos,
   incluida la etapa.
4. Elegir No calificado: confirmar que aparece Motivo y no se puede guardar sin
   elegirlo.
5. Elegir un motivo, guardar y verificar etapa, motivo, cierre y seguimiento.
6. Reabrir a una etapa abierta y comprobar que motivo/fecha se limpian.

## Escenario 4 — Estados protegidos y fallo

1. Registrar ficha de IA, consentimiento, baja/archivo o seguimiento en el dato
   de prueba.
2. Editar únicamente datos personales y confirmar que esos estados se conservan.
3. Simular un PATCH 500; comprobar que el editor no se cierra ni borra valores.

## Responsive y teclado

- Repetir el modal a 375, 768 y 1440 px sin overflow horizontal.
- Abrir, recorrer, guardar/cancelar y cerrar con teclado.
- Confirmar título, etiquetas y error anunciable.

## Gate técnico

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
bash tests/e2e/us24-edicion-prospecto.sh
```
