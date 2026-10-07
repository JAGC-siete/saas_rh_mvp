import Link from 'next/link'
import PublicPageShell from '../landing/PublicPageShell'
import PublicPageHead from '../SEO/PublicPageHead'
import RelatedGuides from '../SEO/RelatedGuides'
import SchemaMarkup from '../SEO/SchemaMarkup'
import TrackedInternalCta from '../TrackedInternalCta'
import {
  generateBreadcrumbListSchema,
  generateFAQPageSchema,
  generateWebPageSchema,
} from '../../lib/seo/schema'
import {
  COUNTRY_LABEL,
  COUNTRY_SCHEMA_LANG,
  type MatrixCalculatorEntry,
} from '../../lib/public-calculator/registry'
import { deductionCalculatorPublicPath } from '../../lib/marketing/calculator-public-paths'
import { HorasExtraHnForm, VacacionesHnForm } from './matrix/MatrixCalculatorForms'

const FORMS = {
  'vacaciones-hn': VacacionesHnForm,
  'horas-extra-hn': HorasExtraHnForm,
} as const

function formatReviewed(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Página de calculadora del registro (lib/public-calculator/registry.ts): answer-first, ejemplo, base legal, FAQ, CTA. */
export default function MatrixCalculatorPage({ entry }: { entry: MatrixCalculatorEntry }) {
  const Form = entry.engine ? FORMS[entry.engine] : null
  const country = COUNTRY_LABEL[entry.country]
  const schemas: object[] = [
    generateWebPageSchema({
      url: entry.path,
      title: entry.title,
      description: entry.description,
      inLanguage: COUNTRY_SCHEMA_LANG[entry.country],
    }),
    generateBreadcrumbListSchema([
      { name: 'Inicio', url: '/' },
      { name: 'Calculadoras', url: '/calculadora' },
      { name: entry.breadcrumbLabel, url: entry.path },
    ]),
  ]
  if (entry.faqs.length > 0) schemas.push(generateFAQPageSchema(entry.faqs))

  return (
    <PublicPageShell>
      <PublicPageHead
        title={entry.title}
        description={entry.description}
        canonicalPath={entry.path}
        keywords={entry.keywords}
        noindex={!entry.legalValidated}
      />
      <SchemaMarkup schema={schemas} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {!entry.legalValidated ? (
          <div role="status" className="mb-6 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm">
            <strong>En validación.</strong> Esta calculadora todavía no está validada legalmente; no uses sus resultados para pagos.
          </div>
        ) : null}

        <nav aria-label="Ruta" className="text-xs text-brand-300 mb-4">
          <Link href="/calculadora" className="hover:text-white">Calculadoras</Link> · {country}
        </nav>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">{entry.h1}</h1>
        <p className="text-lg text-brand-100 mb-8">{entry.answer}</p>

        {Form ? (
          <section className="glass-modern rounded-2xl p-5 sm:p-6 border border-white/15 mb-10">
            <Form />
          </section>
        ) : (
          <section className="glass-modern rounded-2xl p-5 sm:p-6 border border-white/15 mb-10 text-brand-100">
            <p className="mb-4">Mientras tanto puedes calcular tu salario neto con la calculadora de deducciones de {country}.</p>
            <Link
              href={deductionCalculatorPublicPath(entry.country)}
              className="inline-flex py-3 px-6 btn-shiny bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl"
            >
              Calculadora de deducciones {country}
            </Link>
          </section>
        )}

        {entry.workedExample ? (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">Ejemplo resuelto</h2>
            <div className="glass-modern rounded-2xl p-5 border border-white/10 text-brand-100">
              <ul className="mb-3 list-disc pl-5">
                {entry.workedExample.inputs.map((i) => <li key={i}>{i}</li>)}
              </ul>
              <ol className="mb-3 list-decimal pl-5">
                {entry.workedExample.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <p className="font-bold text-white">Resultado: {entry.workedExample.result}</p>
            </div>
          </section>
        ) : null}

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-4">Base legal</h2>
          <ul className="space-y-2 text-brand-100">
            {entry.legalBasis.map((b) => (
              <li key={`${b.article}-${b.law}`}>
                {b.article ? <strong className="text-white">{b.article}, </strong> : null}
                {b.sourceUrl ? (
                  <a href={b.sourceUrl} rel="noopener noreferrer" target="_blank" className="underline hover:text-white">{b.law}</a>
                ) : (
                  b.law
                )}
                {!b.article && !b.sourceUrl ? <span className="text-brand-300"> (artículo por confirmar)</span> : null}
              </li>
            ))}
          </ul>
          <p className="text-sm text-brand-300 mt-3">Vigente a {formatReviewed(entry.vigenteA)}.</p>
        </section>

        {entry.faqs.length > 0 ? (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {entry.faqs.map((f) => (
                <div key={f.question} className="glass-modern rounded-xl p-5 border border-white/10">
                  <h3 className="font-semibold text-white mb-2">{f.question}</h3>
                  <p className="text-brand-100">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mb-12 text-center glass-modern rounded-xl p-6 border border-brand-500/30 bg-brand-600/10">
          <h2 className="text-xl font-bold text-white mb-2">Automatiza este cálculo en tu planilla</h2>
          <p className="text-brand-200/90 mb-4">Humano SISU calcula vacaciones, horas extra, deducciones y prestaciones desde la asistencia biométrica.</p>
          <TrackedInternalCta
            href={`/activar?country=${entry.country}`}
            ctaType="activar_trial"
            location={`calc_${entry.type}_${entry.country.toLowerCase()}`}
            className="inline-flex justify-center py-3 px-6 btn-shiny bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl"
          >
            Activar gratis
          </TrackedInternalCta>
        </section>

        <RelatedGuides currentPath={entry.path} />
      </div>
    </PublicPageShell>
  )
}
