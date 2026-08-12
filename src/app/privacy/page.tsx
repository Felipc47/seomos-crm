import type { Metadata } from "next";
import { LegalPage } from "@/components/public/public-shell";

export const metadata: Metadata = {
  title: "Política de privacidad — Seomos CRM",
  description: "Cómo Seomos CRM accede, usa, almacena y protege los datos, incluidos los datos de Google Calendar.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacidad"
      title="Política de privacidad"
      summary="Esta política explica qué información trata Seomos CRM, por qué la necesita y las decisiones que conservas sobre tus datos."
    >
      <section>
        <h2>1. Responsable y alcance</h2>
        <p>
          Seomos CRM es operado por Seomos. Esta política aplica al sitio público y a las instancias de Seomos CRM administradas por Seomos. Para preguntas o solicitudes de privacidad puedes escribir a <a href="mailto:ceo@seomos.com">ceo@seomos.com</a>.
        </p>
        <p>
          Cuando una empresa usa su propia instancia de Seomos CRM, esa empresa también determina qué información de sus clientes y miembros incorpora al sistema y es responsable de informarles y obtener las autorizaciones que correspondan.
        </p>
      </section>

      <section>
        <h2>2. Información que tratamos</h2>
        <h3>Información de cuenta y organización</h3>
        <p>
          Nombre, dirección de correo, credenciales protegidas, rol, organización, preferencias y datos necesarios para autenticar a la persona y operar su espacio de trabajo.
        </p>
        <h3>Información del CRM y WhatsApp</h3>
        <p>
          Contactos, números de teléfono, mensajes, archivos, conversaciones, prospectos, servicios, asignaciones, notas, estados del pipeline y registros operativos que la empresa incorpora o recibe mediante WhatsApp Cloud API.
        </p>
        <h3>Datos técnicos</h3>
        <p>
          Información básica de sesión, seguridad y diagnóstico necesaria para mantener el servicio, prevenir abuso y resolver errores. No incorporamos herramientas publicitarias ni vendemos perfiles de uso.
        </p>
      </section>

      <section id="google">
        <h2>3. Datos de Google Calendar</h2>
        <p>
          La conexión con Google Calendar es opcional y solo comienza cuando una persona autorizada selecciona “Conectar Google Calendar” y concede los permisos mostrados por Google.
        </p>
        <p>Seomos CRM puede acceder a:</p>
        <ul>
          <li>la dirección de correo de la cuenta conectada, para identificarla dentro del CRM;</li>
          <li>los intervalos de disponibilidad u ocupación del calendario, para evitar reuniones superpuestas;</li>
          <li>los eventos que Seomos CRM necesita crear o actualizar en el calendario principal, incluidos fecha, hora, título, invitados y enlace de Google Meet;</li>
          <li>tokens OAuth, fecha de expiración y permisos concedidos, necesarios para mantener la conexión autorizada.</li>
        </ul>
        <p>
          Usamos estos datos exclusivamente para mostrar disponibilidad y crear o mantener reuniones solicitadas desde Seomos CRM. No usamos datos de Google para publicidad, elaboración de perfiles comerciales, venta de datos ni entrenamiento de modelos de inteligencia artificial.
        </p>
        <p>
          El uso y la transferencia de información recibida de las APIs de Google cumplen la <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noreferrer" target="_blank">Política de datos de usuario de los servicios API de Google</a>, incluidos sus requisitos de uso limitado.
        </p>
      </section>

      <section>
        <h2>4. Finalidades</h2>
        <ul>
          <li>proporcionar el CRM, autenticar usuarios y aislar los espacios de cada organización;</li>
          <li>recibir, mostrar y enviar comunicaciones de WhatsApp autorizadas;</li>
          <li>organizar contactos, prospectos, responsables y etapas comerciales;</li>
          <li>operar las automatizaciones y funciones de IA que la empresa habilite;</li>
          <li>coordinar reuniones mediante Google Calendar cuando se conecta voluntariamente;</li>
          <li>enviar avisos operativos por correo cuando la organización los habilita;</li>
          <li>proteger, mantener y diagnosticar el servicio.</li>
        </ul>
      </section>

      <section>
        <h2>5. Almacenamiento y seguridad</h2>
        <p>
          Seomos CRM es una aplicación self-hosted: los datos de la instancia se almacenan en la infraestructura controlada por su operador. Aplicamos aislamiento por organización, controles de acceso por rol y cifrado AES-256-GCM para credenciales sensibles como los tokens de Google. Los secretos no se entregan al navegador ni se incluyen intencionalmente en logs.
        </p>
        <p>
          Ningún sistema puede garantizar seguridad absoluta. Mantenemos medidas razonables para reducir el acceso, alteración o divulgación no autorizados y revisamos los incidentes que puedan afectar los datos.
        </p>
      </section>

      <section>
        <h2>6. Proveedores e integraciones</h2>
        <p>
          Según las funciones habilitadas, Seomos CRM puede comunicarse con Meta WhatsApp Cloud API, Google Calendar API, el proveedor de IA configurado por la organización y Resend para correos operativos. Cada integración recibe únicamente los datos necesarios para prestar la función solicitada. No vendemos ni alquilamos información personal.
        </p>
        <p>
          También podemos divulgar información cuando sea necesario para cumplir una obligación legal válida, proteger derechos y seguridad, o responder a una autoridad competente.
        </p>
      </section>

      <section>
        <h2>7. Conservación y eliminación</h2>
        <p>
          Conservamos los datos mientras la cuenta o instancia permanezca activa y durante el tiempo necesario para operar el servicio, cumplir obligaciones aplicables o resolver disputas. Los períodos concretos pueden depender de la empresa que administra la instancia.
        </p>
        <p>
          Al desconectar Google Calendar eliminamos de Seomos CRM las credenciales OAuth asociadas. Los eventos ya creados permanecen en el calendario de Google hasta que su propietario los modifique o elimine. También puedes revocar el acceso desde la sección de conexiones de terceros de tu Cuenta de Google.
        </p>
        <p>
          Para solicitar acceso, corrección o eliminación de datos administrados por Seomos, escribe desde el correo asociado a tu cuenta a <a href="mailto:ceo@seomos.com?subject=Solicitud%20de%20privacidad%20-%20Seomos%20CRM">ceo@seomos.com</a>. Si tu cuenta pertenece a una empresa cliente, podremos dirigir la solicitud al administrador responsable de esa instancia.
        </p>
      </section>

      <section>
        <h2>8. Cambios a esta política</h2>
        <p>
          Podemos actualizar esta política para reflejar cambios del producto, requisitos legales o medidas de seguridad. Publicaremos la versión vigente en esta misma URL e indicaremos la fecha de la última actualización.
        </p>
      </section>
    </LegalPage>
  );
}
