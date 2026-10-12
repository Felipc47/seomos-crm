# Release 030 — rediseño SEOMOS e interacción entre pestañas

El CRM adopta una composición nueva con navegación grafito, superficies blancas y grises neutras, Manrope local, naranja corporativo #E84B1D puntual, claro por defecto y oscuro opcional. Dashboard, bandeja, pipeline, contactos y agente mantienen sus controles. La conexión SSE compartida evita que abrir varias pestañas agote las conexiones del navegador y deje formularios esperando.

## Autorización y alcance

El 12 de octubre de 2026, tras revisar el CRM local, el usuario autorizó expresamente desplegar a producción y registrar el cambio en GitHub para poder regresar. Esta autorización sustituye la restricción de solo local de las fases anteriores de esta especificación.

Se publica una PR exclusiva con un commit de integración reversible. No hay cambios de API, autenticación, aislamiento de empresas, proveedores, dependencias, esquema o migraciones. Se preservan los datos y configuración de las empresas y las opciones del agente: créditos, asistente, identidad, tonos, seis secciones, conocimiento, escalado, seguimiento y agenda.

Quedan fuera los cambios locales independientes del paquete de créditos a 700, el formato de hora histórica de mensajes, las especificaciones 025/029 y las memorias/configuraciones locales. No se incluye el directorio output completo ni archivos de sesión, cookies o credenciales reales.

## Punto de retorno verificado antes del despliegue

| Referencia | Valor |
| --- | --- |
| Repositorio | https://github.com/Felipc47/seomos-crm |
| Rama de producción | main |
| URL | https://seomos.cloud |
| Aplicación Coolify | ds8dao6gcn8qg4ro04upkgno |
| Commit anterior | 18426826e0158a2c13704cefacb3d8744434e2cc |
| Etiqueta anterior | prod-before-visual030-2026-10-12 |
| Deployment anterior | hzhptig4fcnhy2fgqcnvi62i (finished) |
| Imagen de retorno | etiqueta 18426826e0158a2c13704cefacb3d8744434e2cc confirmada en rollback_images |
| Estado anterior | App y PostgreSQL running:healthy, 0 reinicios, health HTTPS 200 |

Coolify tenía autodeploy activado y git_commit_sha fijado al commit anterior. La promoción debe actualizar únicamente ese pin al SHA del commit integrado y desplegar esa misma revisión. La GitHub Release prod-visual030-2026-10-12 registrará el SHA final, PR, deployment, comprobaciones públicas y enlaces de reversión una vez verificados.

## Verificación del candidato exacto

El checkout selectivo pasó typecheck, lint, build y 419 tests. Su regresión en localhost:3101 completó **164 comprobaciones en una sola corrida**, sin reutilización ni interrupciones: 18 rutas de escritorio, siete móviles y flujos reales de agente, KB, agenda, asistente, bandeja y contactos. Cero errores JavaScript, 5xx inesperados o solicitudes externas; outbox de mocks vacío. Resultado: [release-result.json](evidence/release-result.json). Las capturas incluidas se actualizaron desde ese checkout. El servidor QA3101 se cerró al terminar.

## Cómo regresar

### Recuperación inmediata en Coolify

1. Fijar git_commit_sha de la aplicación indicada al commit 18426826e0158a2c13704cefacb3d8744434e2cc.
2. Elegir la imagen retenida con esa misma etiqueta y ejecutar rollback; si ya no está retenida, reconstruir y desplegar la etiqueta Git prod-before-visual030-2026-10-12 o ese SHA. La retención observada era de dos imágenes, por lo que la etiqueta Git es el respaldo durable.
3. Esperar estado terminal finished y app running:healthy; revisar logs, /api/health, acceso /login y disponibilidad de las rutas protegidas.
4. No restaurar base de datos: este release no introduce migraciones. Un rollback de código conserva contactos, conversaciones, configuración y datos recibidos después de publicar.

### Reversión registrada en GitHub

En un checkout limpio actualizado de main, crear una rama de reversión y revertir el commit al que apunta la etiqueta final:

```sh
git fetch origin --tags
git switch -c codex/revert-030 origin/main
git revert --no-edit prod-visual030-2026-10-12
git push -u origin codex/revert-030
```

Abrir y revisar una PR hacia main, ejecutar los gates y hacer squash merge. Después fijar Coolify al SHA de esa nueva integración y desplegarlo. No usar reset --hard ni force-push sobre main. Si hubo commits posteriores dependientes, resolver la reversión en esa PR; no eliminar su historia.

## Validación y evidencia

- Revisión del diff por AST: handlers, rutas, permisos, valores, disabled y atributos de ayuda/prueba conservados; cambio intencional del fallback de acento a DEFAULT_BRANDING.accent.
- Gates de la integración local: typecheck, lint, build y 419 tests / 51 archivos. Repetidos y aprobados sobre el paquete selectivo del release antes de promover.
- Regresión local previa: 164 comprobaciones (18 rutas de escritorio, 7 móviles y flujos), más 14 de eliminación KB, 52 multiventana, 14 vistas agente/bandeja y 8 casos de compositor/Ayuda. Evidencia en [evidence](./evidence/).
- La primera regresión se completó en dos tramos por un timeout de retirada visual de KB durante compilación local. El intento se conserva en interruption-kb-timeout.json y la repetición focalizada confirmó DELETE 200 y retirada del DOM en 1,25 s.
- Los JSON y capturas contienen datos ficticios. Proveedores simulados, sin envíos de producción.

Para repetir con la base local de revisión preparada y dependencias instaladas:

```sh
QA_PORT=3101 node tests/e2e/visual030-start-local.mjs
BASE_URL=http://127.0.0.1:3101 QA_OUTPUT_DIR=/tmp/visual030-release-qa node tests/e2e/visual030-regression.mjs
```

El guion rechaza destinos fuera de loopback 3100/3101 y exige mocks activos antes de cualquier mutación. No ejecutarlo contra producción. Al desplegar, verificar también / y /login porque usan los tokens globales y la fuente local; comprobar que los endpoints de pruebas sigan devolviendo 404 y que las API protegidas rechacen sesiones ausentes.
