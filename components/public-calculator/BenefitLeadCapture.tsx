import {
  CalcCheckIcon,
  CalcDocumentIcon,
  CalcIconTextRow,
} from './CalculatorUiIcons'

type Props = {
  headline: string
  subheadline: string
  fullName: string
  email: string
  company: string
  phone: string
  consentNewsletter: boolean
  onFullNameChange: (v: string) => void
  onEmailChange: (v: string) => void
  onCompanyChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onConsentChange: (v: boolean) => void
  onSubmit: () => void
  sending: boolean
  sent: boolean
  showCompanyField?: boolean
  idPrefix?: string
  containerId?: string
}

export default function BenefitLeadCapture({
  headline,
  subheadline,
  fullName,
  email,
  company,
  phone,
  consentNewsletter,
  onFullNameChange,
  onEmailChange,
  onCompanyChange,
  onPhoneChange,
  onConsentChange,
  onSubmit,
  sending,
  sent,
  showCompanyField = false,
  idPrefix = 'lead',
  containerId = 'benefit-lead-capture',
}: Props) {
  const canSubmit =
    fullName.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && consentNewsletter

  return (
    <div
      id={containerId}
      className="glass-modern rounded-2xl border border-cyan-500/40 p-5 sm:p-6 scroll-mt-24 animate-fade-up-subtle"
    >
      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="hidden sm:flex w-16 h-20 shrink-0 rounded-lg border border-white/20 bg-white/5 items-center justify-center text-brand-300">
          <CalcDocumentIcon />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{headline}</h3>
          <p className="text-sm text-brand-200/90 mt-1">{subheadline}</p>
        </div>
      </div>

      <div className="space-y-3">
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          placeholder="Tu nombre"
          className="block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20 placeholder-brand-300/50"
        />
        <input
          id={`${idPrefix}-email`}
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="tu@email.com"
          className="block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20 placeholder-brand-300/50"
        />
        {showCompanyField && (
          <input
            type="text"
            value={company}
            onChange={(e) => onCompanyChange(e.target.value)}
            placeholder="Nombre de la empresa"
            className="block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20"
          />
        )}
        <input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="Teléfono (opcional)"
          className="block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20"
        />
        <label className="flex items-start gap-2 text-sm text-brand-100">
          <input
            type="checkbox"
            checked={consentNewsletter}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-1"
          />
          Acepto recibir el PDF oficial, recordatorios legales y el newsletter de Humano SISU.
        </label>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || sending || sent}
        className="mt-4 w-full py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-xl disabled:opacity-50 transition-all"
      >
        {sent ? (
          <CalcIconTextRow icon={<CalcCheckIcon className="text-green-300" solid />}>
            PDF enviado a tu correo
          </CalcIconTextRow>
        ) : sending ? (
          'Enviando PDF…'
        ) : (
          'Enviar PDF gratis a mi correo'
        )}
      </button>
    </div>
  )
}
