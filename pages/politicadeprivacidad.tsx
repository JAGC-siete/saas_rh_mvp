import Head from 'next/head'
import Link from 'next/link'

export default function PoliticaPrivacidad() {
  return (
    <>
      <Head>
        <title>Política de Privacidad - Humano SISU</title>
        <meta name="description" content="Política de privacidad y manejo de datos de Humano SISU" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-slate-900 text-white">
        {/* Header */}
        <header className="border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link 
              href="/" 
              className="inline-flex items-center text-brand-400 hover:text-brand-300 transition-colors"
            >
              ← Volver al inicio
            </Link>
            <h1 className="text-3xl font-bold mt-4">Política de Privacidad</h1>
            <p className="text-slate-400 mt-2">Última actualización: 17 de agosto de 2025</p>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="prose prose-invert prose-lg max-w-none">
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">1) Responsable</h2>
              <p className="text-slate-300">
                <strong>Humano SISU</strong> ("nosotros"), <strong>Honduras</strong>.
                <br />
                Contacto: <strong>jorge@humanosisu.net</strong> | <strong>+504 9999-9999</strong>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">2) Datos que recopilamos</h2>
              <p className="text-slate-300 mb-4">
                Cuando completás formularios o nos escribís:
              </p>
              <ul className="text-slate-300 space-y-2">
                <li>• <strong>Identificación y contacto:</strong> nombre, email, teléfono, empresa, cargo.</li>
                <li>• <strong>Mensajes y metadatos técnicos mínimos</strong> (IP, fecha/hora) para seguridad.</li>
              </ul>
              <p className="text-slate-300 mt-4">
                No pedimos datos sensibles. Si los incluyes voluntariamente, los borraremos salvo que sean necesarios para atender tu solicitud.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">3) Finalidades</h2>
              <p className="text-slate-300">
                Usamos tus datos <strong>solo para contactarte</strong> y dar seguimiento a tu solicitud: demos, activación del sistema, soporte o envío puntual de la información que pediste.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">4) Base legal</h2>
              <ul className="text-slate-300 space-y-2">
                <li>• <strong>Consentimiento</strong> (cuando marcás el checkbox/enviás el formulario).</li>
                <li>• <strong>Interés legítimo</strong> en responder consultas y mantener la seguridad del servicio.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">5) Conservación</h2>
              <p className="text-slate-300">
                Guardamos tus datos <strong>hasta 12 meses</strong> desde el último contacto o <strong>hasta que retires tu consentimiento</strong>, lo que ocurra primero. Podemos conservar datos mínimos por más tiempo si una obligación legal lo exige (por ejemplo, registros de seguridad).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">6) Destinatarios y encargados</h2>
              <p className="text-slate-300 mb-4">
                No vendemos tus datos. Podemos usar proveedores para operar el servicio (p. ej., hosting, correo, mensajería). Actúan como <strong>encargados de tratamiento</strong> y solo procesan datos según nuestras instrucciones:
              </p>
              <ul className="text-slate-300 space-y-2">
                <li>• <strong>Infraestructura/hosting</strong> (p. ej., <strong>Supabase</strong>, <strong>Railway</strong> u otros equivalentes).</li>
                <li>• <strong>Correo transaccional</strong> (p. ej., <strong>Nodemailer/Resend</strong> u otro).</li>
                <li>• <strong>Mensajería</strong> (p. ej., <strong>WhatsApp/WhatsApp Business API</strong> o integraciones equivalentes).</li>
              </ul>
              <p className="text-slate-300 mt-4">
                Estos proveedores pueden estar ubicados fuera de tu país. En ese caso, adoptamos garantías adecuadas (cláusulas contractuales tipo u otras medidas reconocidas por la normativa aplicable).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">7) Cookies</h2>
              <p className="text-slate-300">
                Usamos <strong>solo cookies técnicas</strong> necesarias para que el sitio funcione. No realizamos publicidad conductual ni perfilado. Si más adelante incorporamos analítica, lo informaremos y pediremos consentimiento.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">8) Tus derechos</h2>
              <p className="text-slate-300 mb-4">
                Podés ejercer <strong>acceso, rectificación, supresión, oposición, limitación y portabilidad</strong>, además de <strong>retirar tu consentimiento</strong> en cualquier momento, escribiendo a <strong>jorge@humanosisu.net</strong> con el asunto "Derechos de datos – [tu nombre]".
              </p>
              <p className="text-slate-300">
                También podés reclamar ante la autoridad de control competente conforme a las <strong>leyes aplicables de protección de datos de Honduras y/o Guatemala</strong>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">9) Seguridad</h2>
              <p className="text-slate-300">
                Aplicamos medidas técnicas y organizativas razonables (cifrado en tránsito, controles de acceso y registro de eventos) para proteger tus datos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">10) Cambios a esta política</h2>
              <p className="text-slate-300">
                Podemos actualizar esta política para reflejar mejoras o cambios legales. Publicaremos la fecha de última actualización y, si el cambio es sustancial, te lo notificaremos por un medio razonable.
              </p>
            </section>

            <hr className="border-white/20 my-8" />

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Aviso corto (para el formulario)</h2>
              <blockquote className="border-l-4 border-brand-500 pl-4 py-2 bg-slate-800/50 rounded-r">
                <p className="text-slate-300">
                  Al enviar aceptás nuestra <strong>Política de Privacidad</strong>. Usaremos tus datos <strong>solo para contactarte</strong> y dar seguimiento a tu solicitud. Podés retirar tu consentimiento y ejercer tus derechos en <strong>jorge@humanosisu.net</strong>.
                </p>
              </blockquote>
              
              <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                <p className="text-slate-300 font-medium">Texto de checkbox:</p>
                <p className="text-slate-300 mt-2">
                  ☐ Doy mi consentimiento para que <strong>Humano SISU</strong> use mis datos <strong>solo para contactarme</strong> y dar seguimiento a mi solicitud.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Footer ultra breve (para landing)</h2>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <p className="text-slate-300">
                  "Protegemos tu información. Sin spam, sin venta de datos. <strong>Solo para contactarte</strong>. Más info en la <strong>Política de Privacidad</strong>."
                </p>
              </div>
            </section>

          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-12">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center">
            <p className="text-slate-400">
              © 2025 Humano SISU. Todos los derechos reservados.
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Protegemos tu información. Sin spam, sin venta de datos.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
