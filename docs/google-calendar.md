# Google Calendar — conexión real (feature 004)

El agendamiento crea eventos con Google Meet e invita al prospecto + los
invitados internos (Ajustes → Calendario). Funciona con cualquier cuenta de
Google (Gmail o Workspace) vía OAuth. Sin configurar, el agente ofrece y guarda
reuniones en el CRM, respetando la jornada y antelación; confirma por chat sin
prometer invitaciones, Meet ni disponibilidad de calendarios externos.

## 1. Crear las credenciales en Google Cloud (una vez, ~10 min)

1. Entra a [console.cloud.google.com](https://console.cloud.google.com) con la
   cuenta de la empresa → **Crear proyecto** (nombre: `seomos-crm`).
2. **APIs y servicios → Biblioteca** → busca **Google Calendar API** →
   **Habilitar**.
3. **APIs y servicios → Pantalla de consentimiento OAuth**:
   - Tipo **Externo** → nombre de la app (`Seomos CRM`), correo de soporte.
   - Scopes: no hace falta agregarlos aquí (van en la solicitud).
   - **Publica la app** (botón "Publicar aplicación"). Mientras esté en modo
     "Prueba", agrega como *test user* el correo que vas a conectar.
4. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de
   OAuth** → tipo **Aplicación web**:
   - URI de redireccionamiento autorizado:
     `https://crm.seomos.cloud/api/google/oauth/callback`
   - Copia el **Client ID** y el **Client Secret**.

## 2. Configurar la instancia (Coolify)

Agrega a las variables de entorno de la app `seomos-crm` y redespliega:

```
GOOGLE_CLIENT_ID=<client id>
GOOGLE_CLIENT_SECRET=<client secret>
```

## 3. Conectar la cuenta (en el CRM)

1. **Ajustes → Calendario → Conectar Google Calendar** con la cuenta donde
   quieres que vivan las reuniones (recomendado: la del comercial). Esa cuenta
   será el **organizador** de cada reunión.
2. Agrega los **invitados internos** (p. ej. el correo del CEO): se invitan a
   TODAS las reuniones junto con el prospecto.
3. Listo: el botón "Agendar reunión" y el agente IA añaden eventos, invitaciones
   y Meet a las nuevas reservas. El refresh token se guarda cifrado
   (AES-256-GCM) y jamás sale al navegador.

## Cómo funciona el agendamiento del agente

Cuando el prospecto acepta una reunión, el agente pide su correo y la fecha, y
crea el evento él mismo; el prospecto recibe la invitación por correo (con
Google Meet) y la confirmación por WhatsApp. Si Google está desconectado o la
conexión venció, registra en el CRM y confirma por chat. Un fallo transitorio
al crear el evento mantiene la respuesta de incidencia y entrega a una persona;
no afirma que se creó un evento cuyo resultado no se pudo confirmar.

## Solución de problemas

- **"Faltan las credenciales de Google en la instancia"** → paso 2 pendiente.
- **"Reconexión necesaria"** → el refresh token fue revocado (cambio de
  contraseña, revocación en myaccount.google.com/permissions). Reconecta en
  Ajustes → Calendario.
- **Google no envía las invitaciones** → verifica que la app OAuth esté
  "Publicada" (no en modo Prueba con el usuario fuera de la lista).
