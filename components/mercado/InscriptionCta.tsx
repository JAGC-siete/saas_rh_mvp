import Link from 'next/link'
import { mercadoInscriptionPath } from '../../lib/mercado/paths'

const CTA_TITLE = '¿Tenés puesto en el mercado?'
const CTA_BODY =
  'Pedí que tu comercio aparezca en este directorio. Es gratis. Recibimos la solicitud y el equipo publica el puesto a mano.'
const CTA_ACTION = 'Solicitar inscripción'

export function MercadoInscriptionHeaderLink() {
  return (
    <Link
      href={mercadoInscriptionPath()}
      className="shrink-0 text-sm font-semibold text-amber-900 underline-offset-4 hover:underline"
    >
      Inscribir mi puesto
    </Link>
  )
}

export function MercadoInscriptionBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <div className="flex flex-col items-start gap-6 rounded-2xl border border-amber-200 bg-white p-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-stone-800">{CTA_TITLE}</h2>
          <p className="mt-3 text-stone-600">{CTA_BODY}</p>
        </div>
        <Link
          href={mercadoInscriptionPath()}
          className="inline-flex items-center rounded-lg px-5 py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: '#d97706' }}
        >
          {CTA_ACTION}
        </Link>
      </div>
    </section>
  )
}

export function MercadoInscriptionCompactCta() {
  return (
    <aside className="mt-12 rounded-xl border border-amber-100 bg-amber-50 p-6">
      <h2 className="text-lg font-semibold text-stone-900">¿Tu comercio no está en el directorio?</h2>
      <p className="mt-2 text-sm text-stone-600">
        Enviá una solicitud de inscripción. Es gratis, no crea una cuenta y la publicación no es inmediata.
      </p>
      <Link
        href={mercadoInscriptionPath()}
        className="mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: '#d97706' }}
      >
        {CTA_ACTION}
      </Link>
    </aside>
  )
}
