import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CostPoint } from '../../lib/dashboard/overview'
import { AXIS_TEXT, ChartTooltipBox, EmptyState, GRID_LINE, LegendItem, Panel, SERIES } from './shared'
import { useDashboardText } from './i18n'

function CostTooltip({
  active,
  payload,
  formatMoney,
}: {
  active?: boolean
  payload?: Array<{ payload: CostPoint }>
  formatMoney: (n: number) => string
}) {
  const { t, date: shortDate } = useDashboardText()
  const p = active ? payload?.[0]?.payload : undefined
  if (!p) return null
  return (
    <ChartTooltipBox
      title={t('cost.tooltip', { month: shortDate(`${p.period}-01`, { month: 'long', year: 'numeric' }), amount: formatMoney(p.gross) })}
      rows={[
        { color: SERIES.net, label: t('cost.net'), value: formatMoney(p.net) },
        { color: SERIES.deductions, label: t('cost.deductions'), value: formatMoney(p.deductions) },
      ]}
    />
  )
}

export default function PayrollCostChart({ trend, formatMoney }: { trend: CostPoint[]; formatMoney: (n: number) => string }) {
  const { t, date: shortDate, number } = useDashboardText()
  const hasData = trend.some((p) => p.gross > 0)
  const monthLabel = (period: string) => shortDate(`${period}-01`, { month: 'short' })
  const compact = (n: number) => number(n, { notation: 'compact', maximumFractionDigits: 1 })

  return (
    <Panel
      title={t('cost.title')}
      subtitle={t('cost.subtitle')}
      action={{ label: t('cost.action'), href: '/app/reports' }}
    >
      {!hasData ? (
        <EmptyState>{t('cost.empty')}</EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <LegendItem color={SERIES.net} label={t('cost.net')} />
            <LegendItem color={SERIES.deductions} label={t('cost.deductions')} />
          </div>
          <div className="h-[220px]" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="32%">
                <CartesianGrid vertical={false} stroke={GRID_LINE} />
                <XAxis dataKey="period" tickFormatter={monthLabel} tick={{ fill: AXIS_TEXT, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={compact} tick={{ fill: AXIS_TEXT, fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                <Tooltip content={<CostTooltip formatMoney={formatMoney} />} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
                <Bar dataKey="net" stackId="cost" fill={SERIES.net} stroke="#0f172a" strokeWidth={1} isAnimationActive={false} />
                <Bar
                  dataKey="deductions"
                  stackId="cost"
                  fill={SERIES.deductions}
                  stroke="#0f172a"
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>{t('cost.caption')}</caption>
            <thead>
              <tr>
                <th>{t('cost.month')}</th>
                <th>{t('cost.gross')}</th>
                <th>{t('cost.net')}</th>
                <th>{t('cost.deductions')}</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((p) => (
                <tr key={p.period}>
                  <td>{p.period}</td>
                  <td>{formatMoney(p.gross)}</td>
                  <td>{formatMoney(p.net)}</td>
                  <td>{formatMoney(p.deductions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Panel>
  )
}
