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
  }> = [
    { id: 'empleado', title: employeeTitle, body: employeeBody, icon: <CalcEmployeeIcon /> },
    { id: 'empresa', title: companyTitle, body: companyBody, icon: <CalcCompanyIcon /> },
  ]

  return (
    <div className="mb-8">
      <h2 className="text-lg sm:text-xl font-bold text-white text-center mb-2">
        ¿Para quién es este cálculo?
      </h2>
      <p className="text-sm text-brand-300/80 text-center mb-5 max-w-lg mx-auto">
        Un clic — personalizamos tu resultado y el PDF que recibirás.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt) => {
          const active = audience === opt.id
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
              className={`w-full text-left rounded-2xl border-2 px-5 py-5 transition-all ${
                active
                  ? 'border-brand-500/80 bg-brand-600/30 text-white shadow-lg shadow-brand-900/30'
                  : 'border-white/20 bg-white/5 text-brand-200 hover:border-cyan-400/50 hover:bg-white/10'
              }`}
              aria-pressed={active}
            >
              <span className="mb-3 block text-brand-200" aria-hidden="true">
                {opt.icon}
              </span>
              <div className="font-semibold text-lg">{opt.title}</div>
              <p className="text-sm mt-2 opacity-90 leading-relaxed">{opt.body}</p>
            </button>
          )
          return active ? (
            <BorderBeam key={opt.id}>{card}</BorderBeam>
          ) : (
            <div key={opt.id}>{card}</div>
          )
        })}
      </div>
    </div>
  )
}
