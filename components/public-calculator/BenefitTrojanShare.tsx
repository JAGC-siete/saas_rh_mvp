import TrackedWhatsAppLink from '../TrackedWhatsAppLink'
import { trackGA4Event } from '../../lib/analytics/ga4'
import { benefitCalculatorUtmSource } from '../../lib/public-calculator/utm'
import type { BenefitTipo } from '../../lib/public-calculator/benefit-config'

const SITE_BASE = 'https://humanosisu.net'

type Props = {
  tipo: BenefitTipo
  labelShort: string
  path: string
  montoFormatted: string
}

export default function BenefitTrojanShare({ tipo, labelShort, path, montoFormatted }: Props) {
  const benefitWord = tipo === '13AVO' ? 'aguinaldo' : 'catorceavo'
  const calcUrl = `${SITE_BASE}${path}?utm_source=${benefitCalculatorUtmSource(tipo)}&utm_medium=trojan&utm_campaign=employee-share`

  const message = `Hola, usé la calculadora de Humano SISU para validar mi ${benefitWord} (${montoFormatted}). Te comparto el desglose para que lo contrastes con la planilla: ${calcUrl}`

  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  const trackingContext = `calc_benefit_trojan_${tipo.toLowerCase()}`

  return (
    <div
      id="trojan-horse"
      className="glass-modern rounded-2xl border border-green-500/30 p-5 sm:p-6 scroll-mt-28"
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl shrink-0" aria-hidden="true">
          🛡️
        </span>
        <div>
          <h3 className="text-lg font-bold text-white">
            ¿Quieres que RRHH use este mismo motor legal para tu {labelShort.toLowerCase()}?
          </h3>
          <p className="text-sm text-brand-200/90 mt-1">
            Envía el desglose validado a tu jefe o departamento de planilla en un clic.
          </p>
        </div>
      </div>
      <TrackedWhatsAppLink
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        trackingContext={trackingContext}
        onClick={() =>
          trackGA4Event('calc_trojan_share', {
            event_category: 'Calculator',
            event_label: `benefit_${tipo}`,
          })
        }
        className="inline-flex w-full justify-center items-center gap-2 py-3.5 px-5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all"
      >
        Enviar desglose validado a RRHH / Jefe
      </TrackedWhatsAppLink>
    </div>
  )
}
