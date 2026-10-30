# Publicación 038 — contactos compartidos

Autorización directa del dueño: «pasalo a produccion de una», 2026-10-30.

- PR #11: https://github.com/Felipc47/seomos-crm/pull/11 (integrado).
- Candidato probado: a11ace564d18bbb2b68fd3ae28d8dca1ad216ade.
- Commit main / pin Coolify: eb1d9a6bfc2786ece06ac2777fd93a58cce3dc62.
- Árbol idéntico en ambos: aaaa5fd7a8365287156fc965badedfb05166a9ff.
- Producción anterior: b9cb7f81e3122feba3b649182c3cf11f705323a8.
- Aplicación: ds8dao6gcn8qg4ro04upkgno, https://seomos.cloud.
- Deployment: j0wok3mhxuvcpbre2tnvii7w, iniciado 2026-10-30 15:27 Bogotá.
- El conector ignoró git_commit_sha sin mutar configuración. Se cambió solo ese
  campo en Git Source del panel autenticado; GET posterior confirmó el pin.
- Finalizado: 2026-10-30 15:40:18 Bogotá (20:40:18 UTC).
- running:healthy, cero reinicios, migrador aplicado y Next Ready en 2.1 s.
- HTTP público health 200; mocks WA/IA 404 e historial anónimo 401.
- Conversación autenticada recargada después del rollout: nuevo fallback visible
  para el contacto histórico sin datos; hilo y controles funcionales. No hubo
  mensajes a clientes ni inyección de fichas ficticias en producción.

Migración 0036: columna message.shared_contacts nullable, aditiva e idempotente.
No modifica mensajes antiguos ni inventa los datos descartados por la ingesta
anterior. La imagen anterior tolera la columna extra si hiciera falta un retorno
expresamente autorizado. No se ejecutó ningún rollback.
