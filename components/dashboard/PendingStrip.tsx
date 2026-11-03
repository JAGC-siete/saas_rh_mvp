import Link from 'next/link'
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import type { PendingItem, PendingSeverity } from '../../lib/dashboard/overview'
import { useDashboardText } from './i18n'

const SEVERITY: Record<PendingSeverity, { chip: string; Icon: typeof ClockIcon }> = {
  urgent: { chip: 'bg-orange-500/15 text-orange-200 ring-orange-400/30', Icon: ExclamationTriangleIcon },
  warning: { chip: 'bg-amber-500/15 text-amber-200 ring-amber-400/30', Icon: ClockIcon },
  info: { chip: 'bg-sky-500/15 text-sky-200 ring-sky-400/30', Icon: InformationCircleIcon },
}

export default function PendingStrip({ items }: { items: PendingItem[] }) {
  const { t, pending } = useDashboardText()
  return (
    <section aria-labelledby="pending-title" className="flex flex-col gap-3">
      <h2 id="pending-title" className="text-[15px] font-bold text-white">
        {t('pending.title')}
        {items.length > 0 && <span className="font-medium text-slate-400">{t('pending.count', { count: items.length })}</span>}
      </h2>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
          <CheckCircleIcon className="h-5 w-5 text-teal-300" aria-hidden />
          {t('pending.allClear')}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
          {items.map((item) => {
            const s = SEVERITY[item.severity]
            const text = pending(item)
            return (
              <article
                key={item.id}
                className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-slate-900/70 p-4 min-h-[148px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.chip}`}>
                    <s.Icon className="h-3.5 w-3.5" aria-hidden />
                    {t(`pending.severity.${item.severity}`)}
                  </span>
                  {text.when && <span className="text-xs text-slate-400 text-right">{text.when}</span>}
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-white">{text.title}</h3>
                  <p className="text-[13px] text-slate-400">{text.detail}</p>
                </div>
                <Link
                  href={item.href}
                  className="inline-flex min-h-[36px] items-center gap-1 self-start text-[13px] font-semibold text-brand-300 hover:text-brand-200"
                >
                  {text.cta} <span aria-hidden>→</span>
                </Link>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
