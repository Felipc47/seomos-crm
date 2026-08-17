import type { Metadata } from "next";
import { LegalPage } from "@/components/public/public-shell";

export const metadata: Metadata = {
  title: "Términos del servicio",
  description: "Condiciones aplicables al acceso y uso de Seomos CRM y sus integraciones opcionales.",
  alternates: { canonical: "https://seomos.cloud/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Condiciones"
      title="Términos del servicio"
      summary="Estas condiciones establecen las reglas básicas para acceder y utilizar Seomos CRM y sus integraciones."
    >
      <section>
        <h2>1. Aceptación y operador</h2>
        <p>
          Al acceder o utilizar Seomos CRM aceptas estos términos y la Política de privacidad. Seomos CRM es un servicio gestionado por Seomos; puedes contactarnos en <a href="mailto:info@seomos.com">info@seomos.com</a>.
        </p>
        <p>
          Una empresa puede administrar su espacio de trabajo y establecer condiciones adicionales para sus miembros. En caso de conflicto, estas condiciones regulan el servicio prestado por Seomos, mientras que la empresa conserva la responsabilidad sobre sus usuarios y datos comerciales.
        </p>
      </section>

      <section>
        <h2>2. El servicio</h2>
        <p>
          Seomos CRM permite gestionar conversaciones de WhatsApp, contactos, prospectos, equipos, pipeline, automatizaciones, notificaciones y, cuando se habilita, funciones de inteligencia artificial y agendamiento con Google Calendar.
        </p>
        <p>
          Algunas funciones dependen de servicios de terceros y de credenciales configuradas por Seomos o por administradores autorizados. La indisponibilidad o modificación de esos terceros puede limitar temporalmente la función relacionada sin afectar necesariamente el resto del CRM.
        </p>
      </section>

      <section>
        <h2>3. Cuentas y acceso</h2>
        <ul>
          <li>Debes proporcionar información correcta y mantener seguras tus credenciales.</li>
          <li>Eres responsable de la actividad realizada desde tu cuenta, salvo uso no autorizado que hayas reportado oportunamente.</li>
          <li>Los administradores de cada organización asignan roles y pueden habilitar, limitar o retirar el acceso de sus miembros.</li>
          <li>No debes intentar acceder a otra organización, eludir controles de seguridad ni extraer secretos o datos sin autorización.</li>
        </ul>
      </section>

      <section>
        <h2>4. Uso permitido</h2>
        <p>Seomos CRM debe utilizarse de forma lícita y respetando los derechos de terceros. No puedes usarlo para:</p>
        <ul>
          <li>enviar spam, mensajes engañosos o comunicaciones sin consentimiento cuando este sea exigible;</li>
          <li>acosar, discriminar, suplantar identidades o distribuir contenido ilegal o malicioso;</li>
          <li>vulnerar las condiciones de Meta, Google u otros proveedores conectados;</li>
          <li>interferir con la seguridad, disponibilidad o funcionamiento del servicio;</li>
          <li>acceder, compartir o procesar datos para los que no tengas autorización.</li>
        </ul>
      </section>

      <section>
        <h2>5. Datos, privacidad y cumplimiento</h2>
        <p>
          La empresa que administra un espacio de trabajo decide qué datos comerciales incorpora y debe contar con las bases, avisos y autorizaciones necesarias para tratar contactos, conversaciones y datos de sus clientes. Seomos trata la información conforme a la Política de privacidad y a las instrucciones legítimas aplicables al servicio.
        </p>
        <p>
          Al conectar una integración confirmas que tienes autoridad para autorizarla. Puedes desconectar Google Calendar desde Seomos CRM o revocar su acceso desde tu Cuenta de Google.
        </p>
      </section>

      <section>
        <h2>6. Inteligencia artificial y automatizaciones</h2>
        <p>
          Las respuestas y sugerencias generadas automáticamente pueden ser incompletas o equivocadas. La organización debe configurar, supervisar y revisar las automatizaciones apropiadamente, especialmente antes de tomar decisiones relevantes o comunicar información sensible. Seomos CRM incluye mecanismos de escalamiento humano, pero no sustituye el criterio profesional del usuario.
        </p>
      </section>

      <section>
        <h2>7. Integraciones de terceros</h2>
        <p>
          WhatsApp Cloud API, Google Calendar, el proveedor de IA y el servicio de correo conservan sus propios términos y políticas. Seomos no controla sus cambios, interrupciones o decisiones de cuenta. Nos esforzamos por degradar las funciones relacionadas sin bloquear el CRM cuando una integración falla.
        </p>
      </section>

      <section>
        <h2>8. Propiedad intelectual</h2>
        <p>
          El servicio, su diseño y la marca SEOMOS están protegidos por la normativa aplicable. Los componentes de código abierto conservan sus respectivas licencias, que no conceden derechos sobre marcas, logotipos, datos de clientes ni contenidos de terceros. Cada organización conserva los derechos que le correspondan sobre la información que incorpora al sistema.
        </p>
      </section>

      <section>
        <h2>9. Disponibilidad y limitación</h2>
        <p>
          Trabajamos para mantener el servicio seguro y disponible, pero no garantizamos funcionamiento ininterrumpido ni ausencia total de errores. En la medida permitida por la ley aplicable, Seomos no será responsable por pérdidas indirectas, decisiones tomadas únicamente a partir de contenido generado por IA o fallos atribuibles a integraciones administradas por terceros.
        </p>
      </section>

      <section>
        <h2>10. Suspensión y terminación</h2>
        <p>
          Podemos limitar o suspender acceso ante riesgos de seguridad, uso ilegal, incumplimientos graves o solicitudes válidas de la organización responsable. La terminación no elimina automáticamente obligaciones ni datos que deban conservarse por ley o por necesidades legítimas de seguridad y resolución de disputas.
        </p>
      </section>

      <section>
        <h2>11. Cambios y contacto</h2>
        <p>
          Podemos actualizar estos términos para reflejar cambios del producto o requisitos aplicables. La versión vigente se publicará en esta URL con su fecha de actualización. Para preguntas escribe a <a href="mailto:info@seomos.com">info@seomos.com</a>.
        </p>
      </section>
    </LegalPage>
  );
}
