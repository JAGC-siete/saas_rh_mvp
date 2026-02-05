import Head from 'next/head'
import Link from 'next/link'
import MainHeader from '../components/MainHeader'
import DemoFooter from '../components/DemoFooter'
import { getPageTitle } from '../lib/seo/title'
import { getPageDescription } from '../lib/seo/description'
import SchemaMarkup from '../components/SEO/SchemaMarkup'
import { generateWebPageSchema, generateFAQPageSchema } from '../lib/seo/schema'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'

const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })

export default function DeduccionesHondurasPage() {
  const pageTitle = getPageTitle('deduccionesHonduras')
  const pageDescription = getPageDescription('deduccionesHonduras')
  const webPageSchema = generateWebPageSchema({
    url: '/deducciones-honduras-ihss-rap-isr',
    title: pageTitle,
    description: pageDescription
  })

  const faqs = [
    {
      question: '¿Cómo se calcula el IHSS en Honduras?',
      answer: 'El IHSS se calcula sobre el salario base del empleado, con un tope máximo establecido por la ley. El empleado paga el 2.5% y el empleador el 2.5% adicional. Humano SISU calcula esto automáticamente según la ley vigente.'
    },
    {
      question: '¿Qué es el RAP y cómo se calcula?',
      answer: 'El RAP (Régimen de Ahorro para Pensiones) es una deducción del 1.5% sobre el salario base del empleado, con un tope máximo. Humano SISU calcula el RAP automáticamente según los montos actualizados por la ley hondureña.'
    },
    {
      question: '¿Cómo se calcula el ISR en Honduras?',
      answer: 'El ISR (Impuesto sobre la Renta) se calcula según tablas progresivas establecidas por la ley. Depende del salario del empleado y se aplican diferentes porcentajes según rangos. Humano SISU actualiza estas tablas automáticamente cada año.'
    },
    {
      question: '¿Por qué usar software en lugar de Excel para calcular deducciones?',
      answer: 'Excel es propenso a errores humanos, requiere actualización manual de tablas fiscales, y no garantiza cumplimiento legal. Humano SISU calcula todo automáticamente, se actualiza con cambios en la ley, y genera comprobantes auditables.'
    },
    {
      question: '¿Humano SISU se actualiza cuando cambian las leyes fiscales?',
      answer: 'Sí, Humano SISU se actualiza automáticamente cuando hay cambios en las leyes de IHSS, RAP o ISR. No necesitas hacer nada, el sistema siempre calcula según la ley vigente.'
    }
  ]

  const faqSchema = generateFAQPageSchema(faqs)

  const comparison = [
    {
      aspect: 'Precisión',
      excel: 'Propenso a errores',
      humanoSisu: '100% preciso',
      icon: '🎯'
    },
    {
      aspect: 'Actualización de tablas',
      excel: 'Manual, fácil de olvidar',
      humanoSisu: 'Automática',
      icon: '🔄'
    },
    {
      aspect: 'Cumplimiento legal',
      excel: 'No garantizado',
      humanoSisu: 'Garantizado',
      icon: '✅'
    },
    {
      aspect: 'Tiempo de cálculo',
      excel: 'Horas por empleado',
      humanoSisu: 'Segundos para todos',
      icon: '⚡'
    },
    {
      aspect: 'Auditoría',
      excel: 'Difícil de rastrear',
      humanoSisu: 'Completa y automática',
      icon: '📋'
    }
  ]

  return (
    <div className="min-h-screen bg-app text-white flex flex-col pt-16 sm:pt-20 md:pt-24 relative">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://humano-sisu.com/deducciones-honduras-ihss-rap-isr" />
        <link rel="canonical" href="https://humano-sisu.com/deducciones-honduras-ihss-rap-isr" />
        <meta name="keywords" content="cálculo IHSS RAP ISR automático, deducciones Honduras, planilla con IHSS, cálculo nómina Honduras, IHSS RAP ISR 2025" />
      </Head>
      <SchemaMarkup schema={[webPageSchema, faqSchema]} />

      <MainHeader enableScrollEffect={true} fixed={true} />

      {/* Hero Section */}
      <section className="py-4 sm:py-6 md:py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 mb-6 sm:mb-8 animate-fade-up-subtle">
            <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
              ✅ 100% Preciso
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
              🔄 Actualizado Automáticamente
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
              📋 Cumplimiento Legal
            </span>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
              🎁 30 días gratis
            </span>
          </div>

          {/* Hero Title */}
          <div className="text-center mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight sm:leading-tight">
              <span className="text-white block sm:inline">Control de asistencia y nómina en un solo lugar:</span>
              <span className="text-brand-300 block text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mt-2 sm:mt-1">Sin cálculos manuales, sin errores.</span>
            </h1>
            <p className="text-lg sm:text-xl text-brand-200/90 max-w-3xl mx-auto mt-4 sm:mt-6">
              Integra tus biométricos con nuestro software 100% hondureño. Automatiza el cálculo de IHSS, RAP e ISR mientras tu equipo se enfoca en crecer.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6">
            <Link
              href="/activar"
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-sky-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-sky-700 transition-colors shadow-sm"
            >
              Activar gratis hoy - Sin tarjeta de crédito
            </Link>
            <Link
              href="/calculadora-deducciones"
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-green-700 transition-colors shadow-sm"
            >
              Probar Calculadora Gratis
            </Link>
          </div>
        </div>
      </section>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* What Are Deductions */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            ¿Qué son las Deducciones en Honduras?
          </h2>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
              <div className="text-4xl mb-4">🏥</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">IHSS</h3>
              <p className="text-brand-200/90 mb-3 text-sm sm:text-base">
                <strong>Instituto Hondureño de Seguridad Social</strong>
              </p>
              <p className="text-xs sm:text-sm text-brand-200/70">
                Deducción del 2.5% para empleado y 2.5% para empleador sobre el salario base, 
                con tope máximo establecido por ley.
              </p>
            </div>
            <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">RAP</h3>
              <p className="text-brand-200/90 mb-3 text-sm sm:text-base">
                <strong>Régimen de Ahorro para Pensiones</strong>
              </p>
              <p className="text-xs sm:text-sm text-brand-200/70">
                Deducción del 1.5% sobre el salario base del empleado, con tope máximo 
                establecido por ley.
              </p>
            </div>
            <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">ISR</h3>
              <p className="text-brand-200/90 mb-3 text-sm sm:text-base">
                <strong>Impuesto sobre la Renta</strong>
              </p>
              <p className="text-xs sm:text-sm text-brand-200/70">
                Impuesto progresivo calculado según tablas fiscales, que varía según 
                el salario del empleado.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison Excel vs Humano SISU */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            Excel vs Humano SISU: ¿Cuál es Mejor?
          </h2>
          <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 overflow-x-auto border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-4 px-4">Aspecto</th>
                  <th className="text-center py-4 px-4">Excel Manual</th>
                  <th className="text-center py-4 px-4">Humano SISU</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((item, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span>{item.icon}</span>
                        <span className="font-semibold">{item.aspect}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-red-400">
                      {item.excel}
                    </td>
                    <td className="py-4 px-4 text-center text-green-400 font-semibold">
                      {item.humanoSisu}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* How Humano SISU Calculates */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            ¿Cómo Calcula Humano SISU?
          </h2>
          <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-white/10">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold mb-1">Tablas Fiscales Actualizadas</h3>
                  <p className="text-gray-300">
                    Humano SISU mantiene las tablas de IHSS, RAP e ISR actualizadas según la ley vigente. 
                    Cuando hay cambios, el sistema se actualiza automáticamente.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold mb-1">Cálculo Automático</h3>
                  <p className="text-gray-300">
                    Ingresas el salario del empleado y el sistema calcula automáticamente todas las deducciones. 
                    No necesitas hacer fórmulas ni buscar tablas.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold mb-1">Comprobantes Automáticos</h3>
                  <p className="text-gray-300">
                    Cada cálculo genera un comprobante PDF automático que puedes enviar al empleado 
                    por email o WhatsApp.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold mb-1">Auditoría Completa</h3>
                  <p className="text-gray-300">
                    Todos los cálculos quedan registrados y auditables. Puedes ver el historial completo 
                    de cada nómina y cada deducción.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
            Preguntas Frecuentes
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                <h3 className="text-base sm:text-lg font-bold mb-2 text-white">{faq.question}</h3>
                <p className="text-brand-200/90 text-sm sm:text-base">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center glass-strong rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 mb-12 sm:mb-16 border border-white/10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white">
            ¿Listo para automatizar tus deducciones?
          </h2>
          <p className="text-lg sm:text-xl text-brand-200/90 mb-6 sm:mb-8">
            Prueba Humano SISU gratis por 30 días. Cálculo automático de IHSS, RAP e ISR incluido.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link
              href="/activar"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-sky-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-sky-700 transition-colors shadow-sm"
            >
              Comenzar Prueba Gratis
            </Link>
            <Link
              href="/calculadora-deducciones"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              Probar Calculadora
            </Link>
          </div>
        </section>
      </main>

      <CloudBackground />
      <DemoFooter />
    </div>
  )
}

