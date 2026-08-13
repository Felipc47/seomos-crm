# Research: Integración de formularios WordPress

## Decisión 1 — Webhook canónico en vez de acoplamiento a un constructor

**Decision**: Exponer un contrato estable que acepta JSON y formulario codificado, y documentar mapeos para Contact Form 7, Elementor Forms, WPForms y clientes propios.

**Rationale**: Los constructores cambian sus plugins y nombres internos, mientras el negocio necesita una frontera durable. Un contrato canónico permite adaptar WordPress sin introducir su código o dependencias dentro del CRM.

**Alternatives considered**: leer la base de datos de WordPress (rompe soberanía/seguridad y despliegues); implementar un endpoint distinto por constructor (duplica reglas); recibir cualquier payload y adivinar campos (ambiguo e inseguro).

## Decisión 2 — Secreto por integración, cifrado y revelado una vez

**Decision**: Generar 32 bytes aleatorios, transportar como Bearer, cifrar con el adaptador AES-GCM existente y comparar en tiempo constante; mostrar el valor completo solo al crear o rotar.

**Rationale**: Permite revocar un sitio sin afectar otros, respeta el patrón de WhatsApp/Calendar y evita exponer un secreto global en WordPress o la UI.

**Alternatives considered**: secreto de entorno único (sin multi-tenant ni rotación granular); firma HMAC (requiere acceso al body crudo y configuración más difícil en constructores); secreto en query/path (aparece con más facilidad en logs y analítica).

## Decisión 3 — Identificador externo obligatorio

**Decision**: Exigir `externalId` estable por entrega y deduplicar por empresa + integración + identificador.

**Rationale**: El contenido puede repetirse legítimamente; un hash del payload confundiría dos personas o reenvíos válidos. WordPress y los constructores pueden generar/conservar un UUID al completar el formulario.

**Alternatives considered**: hash del body (colisiones semánticas); ventana temporal teléfono+contenido (no determinista); aceptar sin idempotencia (viola la constitución).

## Decisión 4 — Allowlist de datos, sin payload crudo

**Decision**: Persistir solo nombre, teléfono, email, mensaje, fuente, campaña y URL sanitizados, además del ledger mínimo.

**Rationale**: Un formulario puede incluir contraseñas, tokens, cookies o campos especiales. El CRM no necesita esos datos para convertir el lead y su almacenamiento amplía innecesariamente el riesgo.

**Alternatives considered**: JSONB completo (riesgo y retención opaca); mapa dinámico configurable (se acerca a un constructor de automatizaciones fuera de foco).

## Decisión 5 — Consentimiento explícito antes de WhatsApp saliente

**Decision**: Registrar `web_form` como origen y `consent_granted_at` únicamente cuando `consent=true`; sin esa señal el lead entra pero no recibe saludo.

**Rationale**: Enviar un teléfono no prueba consentimiento. La separación conserva el pipeline sin convertir cualquier formulario en una campaña no autorizada.

**Alternatives considered**: tratar todo formulario como Meta Lead Ads (origen y política distintos); nunca saludar formularios (pierde automatización incluso con permiso).

## Decisión 6 — Persistencia síncrona, proveedores después

**Decision**: Completar ledger, contacto, conversación, lead y atribución antes de responder; programar email/saludo y SSE secundario después del resultado durable, con marcadores idempotentes y errores sanitizados.

**Rationale**: WordPress necesita una respuesta rápida para no reintentar, pero el lead no puede perderse si WhatsApp o Resend tarda/falla.

**Alternatives considered**: esperar todos los proveedores (latencia y acoplamiento); responder antes de persistir (riesgo de pérdida); cola externa (prohibida por soberanía y arquitectura actual).

## Decisión 7 — Limitación local acorde a la topología

**Decision**: Ventana fija en memoria por integración/IP para ráfagas de la ruta pública, además de body limit, secreto de 256 bits y restricciones de base de datos.

**Rationale**: El producto ejecuta un único proceso por contenedor y no admite Redis/colas. El control local reduce abuso accidental sin sumar infraestructura; las defensas durables siguen siendo autenticación y unicidad.

**Alternatives considered**: tabla de cada intento inválido (amplifica escritura atacante y retiene IPs); proveedor WAF obligatorio (dependencia externa); Redis (prohibido por constitución).
