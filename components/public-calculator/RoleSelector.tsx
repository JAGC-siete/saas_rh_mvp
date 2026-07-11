import BorderBeam from '../landing/BorderBeam'
import { trackGA4Event } from '../../lib/analytics/ga4'
import { CalcCompanyIcon, CalcEmployeeIcon } from './CalculatorUiIcons'
import {
  SPOTLIGHT_ACCENTS,
  SpotlightGlowOverlay,
  useSpotlightGlow,
} from '../ui/spotlightGlow'

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
  const empleadoGlow = useSpotlightGlow<HTMLButtonElement>()
  const empresaGlow = useSpotlightGlow<HTMLButtonElement>()

  const options: Array<{
    id: CalculatorRole
    title: string
    body: string
    icon: React.ReactNode
    emphasis: 'primary' | 'secondary'
    accent: (typeof SPOTLIGHT_ACCENTS)[keyof typeof SPOTLIGHT_ACCENTS]
    glow: ReturnType<typeof useSpotlightGlow<HTMLButtonElement>>
  }> = [
    {
      id: 'empleado',
      title: employeeTitle,
      body: employeeBody,
      icon: <CalcEmployeeIcon />,
      emphasis: 'primary',
      accent: SPOTLIGHT_ACCENTS.gold,
      glow: empleadoGlow,
    },
    {
      id: 'empresa',
      title: companyTitle,
      body: companyBody,
      icon: <CalcCompanyIcon />,
      emphasis: 'secondary',
      accent: SPOTLIGHT_ACCENTS.green,
      glow: empresaGlow,
    },
  ]

  return (
    <div className="mb-8">
      <h2 className="text-lg sm:text-xl font-bold text-white text-center mb-2">
        ¿Para quién es este cálculo?
      </h2>
      <p className="text-xs sm:text-sm text-brand-400 text-center mb-5 max-w-lg mx-auto">
        Selecciona en una tarjeta
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1.6fr_1fr] gap-4 items-stretch">
        {options.map((opt) => {
          const active = audience === opt.id
          const primary = opt.emphasis === 'primary'
          const card = (
            <button
              ref={opt.glow.ref}
              type="button"
              onMouseMove={opt.glow.onMouseMove}
              onMouseLeave={opt.glow.onMouseLeave}
              onClick={() => {
                onSelect(opt.id)
                trackGA4Event('calc_audience_select', {
                  event_category: 'Calculator',
                  event_label: opt.id,
                  tool,
                })
              }}
              className={`group relative overflow-hidden h-full w-full text-left rounded-2xl border-2 transition-all [--glow-x:50%] [--glow-y:30%] ${
                primary ? 'px-6 py-7 sm:py-9' : 'px-5 py-5 sm:py-6'
              } ${
                active
                  ? `${opt.accent.activeBorder} text-white shadow-lg shadow-brand-900/30`
                  : `border-white/15 bg-white/5 hover:bg-white/10 ${opt.accent.borderHover} ${opt.accent.shadowHover} ${
                      primary ? 'text-white' : 'text-brand-200/90'
                    }`
              }`}
              aria-pressed={active}
            >
              <SpotlightGlowOverlay glow={opt.accent.glow} baseOpacity="opacity-0" />
              <span
                className={`relative z-10 mb-3 block ${
                  primary ? 'text-white scale-110 origin-left' : 'text-brand-300/80'
                }`}
                aria-hidden="true"
              >
                {opt.icon}
              </span>
              <div
                className={`relative z-10 font-semibold ${
                  primary ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg opacity-90'
                }`}
              >
                {opt.title}
              </div>
              {opt.body ? (
                <p
                  className={`relative z-10 mt-2 leading-relaxed ${
                    primary ? 'text-sm sm:text-base opacity-90' : 'text-xs sm:text-sm opacity-75'
                  }`}
                >
                  {opt.body}
                </p>
              ) : null}
            </button>
          )
          return active ? (
            <BorderBeam key={opt.id} className="h-full">
              {card}
            </BorderBeam>
          ) : (
            <div key={opt.id} className="h-full">
              {card}
            </div>
          )
        })}
      </div>
    </div>
  )
}
