import { ClockIcon, CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation, Trans } from 'next-i18next'

export default function ServicesSection() {
  const { t } = useTranslation(['common', 'landing'])
  const steps = t('services.steps', { returnObjects: true }) as any[]
  const pulso = t('services.pulso', { returnObjects: true }) as any
  const reports = t('services.reports', { returnObjects: true }) as any
  const nomina = t('services.nomina', { returnObjects: true }) as any
  const calculo = t('services.calculo', { returnObjects: true }) as any
  const proofItems = t('services.proof.items', { returnObjects: true }) as string[]

  return (
    <section id="servicios" className="relative py-20 px-6 max-w-7xl mx-auto">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="mx-auto h-72 w-72 blur-3xl rounded-full opacity-20 bg-brand-600/40 translate-y-8" />
      </div>

      <div className="max-w-6xl mx-auto mb-20">
        <div className="text-center mb-8">
          <div className="inline-block bg-gray-800/50 text-gray-300 text-sm font-medium px-4 py-2 rounded-full mb-6">
            {t('services.howItWorks')}
          </div>
          <h2 className="text-3xl font-bold text-white mb-8">{t('services.replace')}</h2>
        </div>

        <div className="bg-gray-900/50 border border-green-500/30 rounded-2xl p-8 max-w-4xl mx-auto">
          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-green-400 font-bold text-lg">{i + 1}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-300">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <header className="max-w-3xl mb-10 mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          {t('services.robotsTitle')}
        </h2>
        <p className="mt-3 text-brand-200">
          <Trans i18nKey="services.robotsSubtitle" components={[<span key="0" className="text-brand-400" />]} />
        </p>
      </header>

      <div id="libro-rojo" className="mb-16">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">{t('services.pulsoTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <article className="group relative overflow-hidden rounded-2xl glass border border-white/15 p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15">
                <ClockIcon className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{pulso.title}</h3>
                <p className="text-sm text-brand-300/90">{pulso.desc}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {(pulso.features as string[]).map((f) => (
                <li key={f} className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> {f}</li>
              ))}
            </ul>
          </article>

          <article className="group relative overflow-hidden rounded-2xl glass border border-white/15 p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15">
                <CheckCircleIcon className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{reports.title}</h3>
                <p className="text-sm text-brand-300/90">{reports.desc}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {(reports.features as string[]).map((f) => (
                <li key={f} className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> {f}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>

      <div id="planillero" className="mb-16">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">{t('services.nominaTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <article className="group relative overflow-hidden rounded-2xl glass border border-white/15 p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15">
                <CurrencyDollarIcon className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{nomina.title}</h3>
                <p className="text-sm text-brand-300/90">{nomina.desc}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {(nomina.features as string[]).map((f) => (
                <li key={f} className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> {f}</li>
              ))}
            </ul>
          </article>

          <article className="group relative overflow-hidden rounded-2xl glass border border-white/15 p-6 transition-all duration-300 hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-900/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-white/10 border border-white/15">
                <CurrencyDollarIcon className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{calculo.title}</h3>
                <p className="text-sm text-brand-300/90">{calculo.desc}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {(calculo.features as string[]).map((f) => (
                <li key={f} className="flex gap-3 text-brand-200"><CheckCircleIcon className="h-5 w-5 text-brand-400" /> {f}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>

      <div className="mt-8 rounded-xl glass border border-white/10 p-6 flex flex-col items-center gap-6 text-center">
        <div className="text-brand-200">
          <span className="text-white/90 font-medium">{t('services.proof.tryIt')}</span>
          {proofItems.map((item) => (
            <span key={item} className="flex items-center gap-2 mt-2"><CheckCircleIcon className="h-5 w-5 text-emerald-400" /> {item}</span>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="email"
              placeholder={t('common:cta.emailPlaceholder')}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-brand-200/70 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            />
            <button
              onClick={() => (window.location.href = '/activar')}
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-lg font-semibold shadow-lg bg-sky-600 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-300 hover:-translate-y-0.5 whitespace-nowrap"
              data-analytics="cta_footer_click"
            >
              {t('common:cta.startToday')}
            </button>
          </div>

          <div className="text-sm text-brand-200/60">
            <p>{t('common:cta.trialNote')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
