import { useState } from 'react'
import type { CountryCode } from '../../lib/country/supported'
import { PUBLIC_CALCULATOR_CONFIGS } from '../../lib/public-calculator/config'
import { Button } from '../ui/button'

type Props = {
  country: CountryCode
  onCountryChange: (c: CountryCode) => void
}

type CalcResult = {
  netSalary: number
  grossSalary: number
}

function formatMoney(n: number, country: CountryCode): string {
  const currency = country === 'GTM' ? 'GTQ' : 'HNL'
  return new Intl.NumberFormat('es', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)
}

export default function MiniDeductionEmbed({ country, onCountryChange }: Props) {
  const [salary, setSalary] = useState('15000')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CalcResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const calculate = async () => {
    setLoading(true)
    setError(null)
    try {
      const cfg = PUBLIC_CALCULATOR_CONFIGS[country]
      const res = await fetch('/api/public/calculate-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salary: Number(salary),
          paymentModality: 'mensual',
          year: new Date().getFullYear(),
          country_code: country,
          deductions: cfg.defaultDeductions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al calcular')
      setResult({ netSalary: data.netSalary, grossSalary: data.grossSalary ?? Number(salary) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['HND', 'SLV', 'GTM'] as CountryCode[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onCountryChange(c)}
            className={`px-3 py-1 rounded-full text-xs border ${
              country === c ? 'border-cyan-400 bg-cyan-500/20 text-white' : 'border-white/20 text-brand-300'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <input
        type="number"
        value={salary}
        onChange={(e) => setSalary(e.target.value)}
        placeholder="Salario bruto mensual"
        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white"
      />
      <Button type="button" variant="modern" className="w-full" disabled={loading} onClick={calculate}>
        {loading ? 'Calculando...' : 'Calcular neto (motor legal SISU)'}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {result && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4 text-center">
          <div className="text-xs text-brand-300">Neto estimado</div>
          <div className="text-2xl font-bold text-green-300">{formatMoney(result.netSalary, country)}</div>
          <p className="text-xs text-brand-200/80 mt-2">Mismo motor que el software de nómina.</p>
        </div>
      )}
    </div>
  )
}
