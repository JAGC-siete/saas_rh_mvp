import { useState, type FormEvent, type ReactNode } from 'react'
import { calculateVacacionesHn, type VacacionesHnResult } from '../../../lib/public-calculator/calc/vacaciones-hn'
import { calculateHorasExtraHn, type HorasExtraHnResult } from '../../../lib/public-calculator/calc/horas-extra-hn'
import { OVERTIME_PERCENT_GROUPS, type OvertimePercentGroupKey } from '../../../lib/payroll/overtime-pay'

const INPUT = 'block w-full px-3 py-3 border rounded-xl bg-white/5 text-white border-white/20'
const LABEL = 'block text-sm font-medium text-white mb-2'

function formatHNL(value: number): string {
  return `L. ${value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parseAmount(raw: string): number {
  return Number(raw.replace(/[^\d.]/g, '')) || 0
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ResultRow({ label, value, strong = false }: { label: ReactNode; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-2 border-b border-white/10 ${strong ? 'text-white font-bold text-lg' : 'text-brand-100'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button type="submit" className="w-full py-3 px-6 btn-shiny bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl">
      {children}
    </button>
  )
}

export function VacacionesHnForm() {
  const [salario, setSalario] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [fechaCalculo, setFechaCalculo] = useState(todayISO())
  const [result, setResult] = useState<VacacionesHnResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const salarioMensual = parseAmount(salario)
    if (salarioMensual <= 0) return setError('Ingresa tu salario mensual.')
    if (!fechaIngreso || fechaIngreso > fechaCalculo) return setError('La fecha de ingreso debe ser anterior a la fecha de cálculo.')
    setError(null)
    setResult(calculateVacacionesHn({ salarioMensual, fechaIngreso, fechaCalculo }))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="salario" className={LABEL}>Salario mensual (L)</label>
        <input id="salario" inputMode="decimal" value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="Ej: 15000" className={INPUT} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fechaIngreso" className={LABEL}>Fecha de ingreso</label>
          <input id="fechaIngreso" type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label htmlFor="fechaCalculo" className={LABEL}>Calcular al</label>
          <input id="fechaCalculo" type="date" value={fechaCalculo} onChange={(e) => setFechaCalculo(e.target.value)} className={INPUT} />
        </div>
      </div>
      {error ? <p className="text-red-300 text-sm">{error}</p> : null}
      <SubmitButton>Calcular vacaciones</SubmitButton>

      {result ? (
        <div className="mt-6" aria-live="polite">
          <ResultRow label="Antigüedad" value={`${result.anosCompletos} año(s) completos + ${result.diasLaborados % 360} días`} />
          <ResultRow label="Salario diario (mensual ÷ 30)" value={formatHNL(result.salarioDiario)} />
          {result.anosCompletos > 0 ? (
            <ResultRow strong label={`Último año completo: ${result.diasUltimoAno} días`} value={formatHNL(result.valorUltimoAno)} />
          ) : null}
          <ResultRow
            label={`Año en curso: ${result.diasProporcionales.toLocaleString('es-HN')} días acumulados`}
            value={formatHNL(result.valorProporcional)}
          />
          <p className="text-sm text-brand-200/80 mt-3">
            Al completar el próximo año te corresponderán {result.diasProximoAno} días. El monto del último año aplica si aún no
            gozaste esas vacaciones; el del año en curso es lo que se paga en una liquidación.
          </p>
        </div>
      ) : null}
    </form>
  )
}

export function HorasExtraHnForm() {
  const [salario, setSalario] = useState('')
  const [horas, setHoras] = useState<Record<OvertimePercentGroupKey, string>>({
    pct_25: '',
    night_50: '',
    late_75: '',
    holiday_100: '',
  })
  const [result, setResult] = useState<HorasExtraHnResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const salarioMensual = parseAmount(salario)
    if (salarioMensual <= 0) return setError('Ingresa tu salario mensual.')
    const parsed = Object.fromEntries(Object.entries(horas).map(([k, v]) => [k, parseAmount(v)]))
    setError(null)
    setResult(calculateHorasExtraHn({ salarioMensual, horas: parsed }))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="salario" className={LABEL}>Salario mensual (L)</label>
        <input id="salario" inputMode="decimal" value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="Ej: 24000" className={INPUT} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OVERTIME_PERCENT_GROUPS.map((g) => (
          <div key={g.key}>
            <label htmlFor={g.key} className={LABEL}>Horas {g.label.charAt(0).toLowerCase() + g.label.slice(1)}</label>
            <input
              id={g.key}
              inputMode="decimal"
              value={horas[g.key]}
              onChange={(e) => setHoras((h) => ({ ...h, [g.key]: e.target.value }))}
              placeholder="0"
              className={INPUT}
            />
          </div>
        ))}
      </div>
      {error ? <p className="text-red-300 text-sm">{error}</p> : null}
      <SubmitButton>Calcular horas extra</SubmitButton>

      {result ? (
        <div className="mt-6" aria-live="polite">
          <ResultRow label="Hora ordinaria (mensual ÷ 240)" value={formatHNL(result.tarifaHora)} />
          {result.lineas
            .filter((l) => l.horas > 0)
            .map((l) => (
              <ResultRow key={l.key} label={`${l.horas} h × ${l.multiplicador.toFixed(2)}`} value={formatHNL(l.monto)} />
            ))}
          <ResultRow strong label={`Total ${result.totalHoras} h extra`} value={formatHNL(result.total)} />
        </div>
      ) : null}
    </form>
  )
}
