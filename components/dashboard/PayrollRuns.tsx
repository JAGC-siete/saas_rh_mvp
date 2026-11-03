import Link from 'next/link'
import type { PayrollRunSummary } from '../../lib/dashboard/overview'
import { EmptyState, Panel } from './shared'
import { useDashboardText } from './i18n'

/** Flujo real de payroll_runs: borrador → editada → autorizada. */
const STEPS = [{ status: 'draft' }, { status: 'edited' }, { status: 'authorized' }] as const

function stepIndex(status: string) {
  const i = STEPS.findIndex((s) => s.status === status)
  return i === -1 ? STEPS.length - 1 : i
}

export default function PayrollRuns({
  runs,
  nextPayment,
  formatMoney,
}: {
  runs: PayrollRunSummary[]
  nextPayment: { periodEnd: string; daysUntil: number } | null
  formatMoney: (n: number) => string
}) {
  const { t, date: shortDate, runLabel } = useDashboardText()
  const stepLabel = (i: number) => t(`runs.steps.${STEPS[i].status}`)
  const subtitle = nextPayment
    ? t('runs.nextPayment', {
        date: shortDate(nextPayment.periodEnd),
        when: nextPayment.daysUntil === 0 ? t('runs.today') : t('runs.inDays', { count: nextPayment.daysUntil }),
      })
    : undefined

  return (
    <Panel title={t('runs.title')} subtitle={subtitle} action={{ label: t('runs.action'), href: '/app/payroll' }}>
      {runs.length === 0 ? (
        <EmptyState>{t('runs.empty')}</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {runs.map((r) => {
            const idx = stepIndex(r.status)
            const done = r.status === 'authorized'
            return (
              <div key={r.id} className="flex flex-col gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white first-letter:uppercase">{runLabel(r)}</p>
                    <p className="text-xs text-slate-400">
                      {t('runs.employees', { count: r.employeeCount })}
                      {r.authorizedAt ? t('runs.authorizedOn', { date: shortDate(r.authorizedAt) }) : ''}
                    </p>
                  </div>
                  {r.net !== null && <span className="text-sm font-bold text-white tabular-nums">{formatMoney(r.net)}</span>}
                </div>
                <div className="flex gap-1" role="img" aria-label={t('runs.stepAria', { step: idx + 1, total: STEPS.length, label: stepLabel(idx) })}>
                  {STEPS.map((s, i) => (
                    <span
                      key={s.status}
                      className={`h-1.5 flex-1 rounded-full ${i < idx || done ? 'bg-[#3987e5]' : i === idx ? 'bg-[#c98500]' : 'bg-white/10'}`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold ${done ? 'text-teal-300' : 'text-amber-200'}`}>
                    {stepLabel(idx)}
                    {!done && t('runs.stepOf', { step: idx + 1, total: STEPS.length })}
                  </span>
                  {!done && (
                    <Link
                      href="/app/payroll"
                      className="inline-flex min-h-[36px] items-center rounded-lg bg-brand-600 px-3.5 text-[13px] font-semibold text-white hover:bg-brand-700"
                    >
                      {t('runs.cta')}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
