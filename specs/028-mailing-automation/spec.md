# Feature Specification: Mailing y automatizaciones por tiempo

**Feature Branch**: `codex/028-mailing-automation`
**Created**: 2026-10-08
**Status**: Deployed and verified, including immediate dispatch and guided campaign workflow
**Input**: Campañas completas de mailing y automatizaciones («a la semana enviar X, luego Y»), exclusivamente por email, con el remitente preferido del usuario verificado mediante DNS.

## User Scenarios & Testing

### User Story 1 — Remitente propio y audiencia de email (P1)

El administrador configura un dominio y la dirección desde la que escribe su empresa. Copia los registros DNS, comprueba su verificación y administra listas de suscriptores sin teléfono ni conexión WhatsApp.

**Independent Test**: Configurar un dominio contra el proveedor simulado; observar registros DNS, bloqueo inicial y habilitación tras verificación; agregar un suscriptor solo con nombre y email.

**Acceptance Scenarios**:
1. Dominio pendiente: se muestran tipo, nombre, valor, prioridad y estado de los registros; los envíos permanecen bloqueados.
2. Dominio verificado: se habilita únicamente una dirección perteneciente a ese dominio; otra empresa no puede reclamarlo ni modificarlo.
3. Alta/importación: se normaliza y deduplica por email dentro de la empresa, conserva las bajas previas y exige registrar permiso para marketing.
4. Una dirección sin permiso, dada de baja o suprimida por rebote/queja queda excluida, también si aparece en varias listas.

### User Story 2 — Campañas completas (P1)

Marketing crea una campaña, elige una lista, redacta asunto y contenido personalizado, revisa audiencia y vista previa, envía una prueba y decide enviarla ahora o programarla.

**Independent Test**: Crear desde la UI una campaña, enviar prueba al propio operador, programar y ejercer el envío; comprobar buzón, historial y deduplicación.

**Acceptance Scenarios**:
1. Un borrador se puede guardar, editar, duplicar y previsualizar con `{{nombre}}`.
2. Confirmar envío congela contenido y destinatarios elegibles; cambios posteriores en una lista no agregan envíos a una campaña ya confirmada.
3. La campaña permite programar fecha/hora, pausar, reanudar y cancelar lo pendiente; no revoca emails ya aceptados.
4. El historial identifica destinatario, estado, error sanitizado y fechas. Aceptación y entrega son estados distintos; aperturas/clics solo aparecen cuando hay eventos reales.
5. La baja incluida en cada correo detiene envíos futuros de esa empresa.

### User Story 3 — Secuencias temporales (P1)

Marketing define pasos por días desde que el contacto entra en una lista/secuencia: día 7 X, día 14 Y, día 21 Z. Puede activar la inscripción de nuevos miembros o inscribir los existentes expresamente.

**Independent Test**: Crear y activar una secuencia 7/14/21, inscribir suscriptor, avanzar el reloj de pruebas y comprobar un email distinto en cada fecha, sin duplicados.

**Acceptance Scenarios**:
1. Cada paso tiene día, asunto y cuerpo; los días son estrictamente crecientes y la referencia temporal es visible.
2. Activar inscribe nuevos miembros con permiso. Los anteriores entran solo al elegir «Inscribir contactos existentes»; una inscripción repetida no reinicia el reloj.
3. Pausar no envía pasos vencidos; reanudar conserva las fechas. Tras una interrupción sale como máximo un paso por suscriptor por ciclo, respetando el orden.
4. Bajas/supresiones detienen la secuencia antes de llamar al proveedor. Detener una inscripción cancela todos sus pasos pendientes.
5. Editar una secuencia está limitado al borrador; duplicarla permite nuevas versiones sin alterar inscripciones anteriores.

### Edge Cases

- Mismo email en dos empresas: permisos y bajas independientes.
- DNS pendiente/revocado, key ausente, HTTP 429/5xx, timeout y respuesta sin formato: no se registra entrega ficticia ni se bloquea el CRM.
- Dos cron concurrentes o reinicio tras aceptación: claim atómico e identidad estable de envío; una entrega incierta no se reenvía fuera de la ventana segura.
- Clic de escáner de enlaces: GET de baja muestra confirmación; baja mediante POST y cabecera de one-click.
- Cambio de email/lista/permiso después de programar: se vuelve a comprobar elegibilidad al despachar.
- No se infiere permiso de correo desde permisos de WhatsApp ni se inventan registros DNS.

## Requirements

### Functional Requirements

- **FR-001**: Módulo Mailing exclusivamente por email con suscriptores y listas propios; teléfono y WhatsApp son innecesarios.
- **FR-002**: Aislar todos los datos, acciones, remitentes y bajas por empresa y limitar acceso a Admin/Marketing/Comercial; DNS solo Admin.
- **FR-003**: Configurar nombre, dirección y reply-to del remitente de la empresa; habilitar envío solo tras verificar su dominio.
- **FR-004**: Mostrar registros DNS reales del proveedor y su estado; comprobación de verificación iniciada por el administrador.
- **FR-005**: Alta individual e importación tabular de suscriptores con email válido, nombre y permiso explícito; deduplicar sin reactivar bajas.
- **FR-006**: Crear listas, agregar miembros, mostrar elegibles/excluidos y gestionar bajas individuales.
- **FR-007**: Editor con asunto, contenido, personalización de nombre, vista previa y correos de prueba al email del operador autenticado.
- **FR-008**: Guardar/editar/duplicar borradores y confirmar audiencia y contenido antes de envío inmediato o programado.
- **FR-009**: Pausar, reanudar y cancelar campañas conservando resultados observados.
- **FR-010**: Historial por destinatario con aceptados, entregados, fallidos, bajas, rebotes, aperturas y clics donde existan eventos reales.
- **FR-011**: Crear secuencias de hasta 20 pasos, con días desde inscripción (0–3650) estrictamente crecientes y contenido propio por paso.
- **FR-012**: Inscripción automática al entrar en la lista elegida y manual para contactos existentes; inscripción única por secuencia/suscriptor.
- **FR-013**: Pausa global de secuencia y parada individual de inscripción; respetar orden, reloj original y bajas.
- **FR-014**: Procesar envíos sin navegador abierto, con persistencia, claim atómico, idempotencia y recuperación tras reinicio.
- **FR-015**: Reintentos acotados para fallos temporales; identidad y payload inmutables; resultado incierto expirado exige reconciliación y nunca reenvío ciego.
- **FR-016**: Enlace de baja firmado/aleatorio opaco en todos los emails de marketing; POST idempotente sin sesión y sin exposición de emails.
- **FR-017**: Autenticar eventos del proveedor sobre body crudo, deduplicarlos y atribuir tenant desde el envío local; suprimir rebotes y quejas.
- **FR-018**: Claves únicamente en runtime; ninguna respuesta cruda del proveedor o secreto llega a cliente/logs.
- **FR-019**: Self-test de UI y mocks con caminos feliz/infeliz, DNS, email sin teléfono, importación, aislamiento, tiempos 7/14/21, baja y concurrencia.
- **FR-020**: Solo el superadmin habilita/deshabilita Mailing por empresa desde Empresas. Empresas nuevas deshabilitadas; Seomos habilitada inicialmente para pruebas. El estado persistido gobierna navegación, página, API y despachador; deshabilitar conserva datos y detiene nuevos envíos, con bajas y eventos todavía operativos.
- **FR-021**: Desplegar el cambio autorizado en `https://seomos.cloud` y verificar migraciones, salud, permisos y estado inicial de empresas.
- **FR-022**: DNS, dirección y habilitación de Mailing no modifican remitentes, credenciales ni configuración transaccional existente. Dominios preexistentes o usados por RESEND_FROM_EMAIL solo se consultan; no se cambia tracking ni se solicita nueva verificación sobre ellos.
- **FR-023**: Enviar ahora inicia el procesamiento tras confirmar, sin esperar el cron periódico, manteniendo outbox, permisos vigentes e idempotencia. El envío programado se procesa por un cron exclusivo de Mailing cada minuto, con recuperación conservada.
- **FR-024**: Mostrar un flujo guiado de destinatarios, contenido y revisión/envío; separar claramente Enviar ahora de Programar, indicar destino de pruebas, progreso y bloqueos, distinguir aceptación de entrega y actualizar estados sin recargar manualmente. No enviar contenido editado sin guardar.

### Key Entities

- Remitente de empresa y dominio verificado.
- Suscriptor de mailing, consentimiento y supresión.
- Lista y pertenencia.
- Campaña con contenido y audiencia congelados.
- Secuencia, pasos temporales e inscripción.
- Envío persistente y eventos verificables del proveedor.

## Success Criteria

- **SC-001**: Una empresa completa configuración DNS simulada y administra suscriptores sin teléfono desde Mailing.
- **SC-002**: Una campaña dirigida a tres elegibles genera tres correos personalizados y cero correos a excluidos; repetir el ciclo no duplica.
- **SC-003**: La secuencia 7/14/21 produce exactamente X/Y/Z a partir de cada inscripción y nada antes de cada fecha.
- **SC-004**: Una baja o parada detiene el 100% de pasos aún no reclamados del suscriptor.
- **SC-005**: La segunda empresa y el editor de agente no obtienen/modifican datos de mailing ajenos.
- **SC-006**: DNS pendiente y fallos del proveedor producen estado accionable; la interfaz y otras funciones siguen disponibles.
- **SC-007**: Una empresa no habilitada no ve Mailing, no abre su URL/API ni envía pendientes; solo superadmin cambia ese estado. Habilitar recupera los datos conservados.

## Assumptions

- «Exclusivamente mailing» describe este módulo; las funciones existentes del CRM se preservan.
- El reloj comienza al inscribir al suscriptor, visible en UI, con días de 24 horas; no se retroenvían semanas anteriores.
- Proveedor permitido: Resend; el usuario elige direcciones de dominios que controla por DNS. La edición automática de DNS del hosting queda fuera del alcance.
- Primera versión: editor de texto con HTML generado seguro, links y nombre; sin constructor de arrastrar bloques, adjuntos ni recepción de correo.
- Aperturas/clics dependen de tracking/eventos reales del proveedor y no constituyen prueba de lectura humana.
- El usuario autorizó despliegue y habilitación inicial de Seomos el 2026-10-08. Configurar DNS reales y enviar campañas reales quedan sujetos a acciones explícitas del administrador en el producto.
