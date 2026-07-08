import BorderBeam from '../landing/BorderBeam'
import { trackGA4Event } from '../../lib/analytics/ga4'
import { CalcCompanyIcon, CalcEmployeeIcon } from './CalculatorUiIcons'

export type CalculatorRole = 'empleado' | 'empresa'

type Props = {
  audience: CalculatorRole | null
  onSelect: (role: CalculatorRole) => void
  employeeTitle: string
  employeeBody: string
  companyTitle: string
  companyBody: string
  tool: string
}

export default function RoleSelector({
  audience,
  onSelect,
  employeeTitle,
  employeeBody,
  companyTitle,
  companyBody,
  tool,
}: Props) {
  const options: Array<{
    id: CalculatorRole
    title: string
    body: string
    icon: React.ReactNode
    emphasis: 'primary' | 'secondary'
  }> = [
    { id: 'empleado', title: employeeTitle, body: employeeBody, icon: <CalcEmployeeIcon />, emphasis: 'primary' },
    { id: 'empresa', title: companyTitle, body: companyBody, icon: <CalcCompanyIcon />, emphasis: 'secondary' },
  ]

  return (
    <div className="mb-8">
      <h2 className="text-lg sm:text-xl font-bold text-white text-center mb-2">
        ¿Para quién es este cálculo?
      </h2>
      <p className="text-sm text-brand-300/80 text-center mb-5 max-w-lg mx-auto">
        Un clic — personalizamos tu resultado y el PDF que recibirás.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1.6fr_1fr] gap-4 items-stretch">
        {options.map((opt) => {
          const active = audience === opt.id
          const primary = opt.emphasis === 'primary'
          const card = (
            <button
              type="button"
              onClick={() => {
                onSelect(opt.id)
                trackGA4Event('calc_audience_select', {
                  event_category: 'Calculator',
                  event_label: opt.id,
                  tool,
                })
              }}
              className={`h-full w-full text-left rounded-2xl border-2 transition-all ${
                primary ? 'px-6 py-7 sm:py-9' : 'px-5 py-5 sm:py-6'
              } ${
                active
                  ? 'border-brand-500/80 bg-brand-600/30 text-white shadow-lg shadow-brand-900/30'
                  : primary
                    ? 'border-brand-400/50 bg-brand-500/10 text-white hover:border-brand-400/80 hover:bg-brand-500/20 shadow-lg shadow-brand-900/20'
                    : 'border-white/15 bg-white/5 text-brand-200/90 hover:border-cyan-400/40 hover:bg-white/10'
              }`}
              aria-pressed={active}
            >
              <span
                className={`mb-3 block ${primary ? 'text-brand-100 scale-110 origin-left' : 'text-brand-300/80'}`}
                aria-hidden="true"
              >
                {opt.icon}
              </span>
              <div className={`font-semibold ${primary ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg opacity-90'}`}>
                {opt.title}
              </div>
              {opt.body ? (
                <p className={`mt-2 leading-relaxed ${primary ? 'text-sm sm:text-base opacity-90' : 'text-xs sm:text-sm opacity-75'}`}>
                  {opt.body}
                </p>
              ) : null}
            </button>
          )
          return active ? (
            <BorderBeam key={opt.id} className="h-full">{card}</BorderBeam>
          ) : (
            <div key={opt.id} className="h-full">{card}</div>
          )
        })}
      </div>
    </div>
  )
}
