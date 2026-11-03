import { useLocale, useTranslations } from 'next-intl'
import type { CalendarEvent, PendingItem, RunPeriod } from '../../lib/dashboard/overview'
import { intlLocale } from '../../lib/i18n/app/locale'
import { shortDate } from './shared'

/**
 * Dashboard phrases in the admin's language, built from the raw `data` the API sends.
 * Items without `data` (older responses) keep the Spanish text from the server.
 */
export function useDashboardText() {
  const t = useTranslations('dashboard')
  const locale = intlLocale(useLocale())

  const date = (iso: string, opts?: Intl.DateTimeFormatOptions) => shortDate(iso, opts, locale)
  const number = (n: number, opts?: Intl.NumberFormatOptions) => n.toLocaleString(locale, opts)

  /** Signed days from today: negative = past. */
  const relative = (days: number) => {
    if (days === 0) return t('relative.today')
    if (days === -1) return t('relative.yesterday')
    if (days === 1) return t('relative.tomorrow')
    return days < 0 ? t('relative.daysAgo', { count: -days }) : t('relative.inDays', { count: days })
  }

  const runLabel = (p: RunPeriod) => {
    const month = new Date(Date.UTC(p.year, p.month - 1, 1)).toLocaleDateString(locale, { month: 'long', timeZone: 'UTC' })
    if (p.quincena === 1 || p.quincena === 2) return t('run.half', { half: String(p.quincena), month, year: p.year })
    return t('run.month', { month: `${month.charAt(0).toUpperCase()}${month.slice(1)}`, year: p.year })
  }

  const pending = (item: PendingItem) => {
    const d = item.data
    if (!d) return { title: item.title, detail: item.detail, when: item.when, cta: item.cta }
    const days = d.days ?? null
    switch (item.id) {
      case 'open_punches':
        return {
          title: t('pending.openPunchesTitle', { count: item.count }),
          detail: t('pending.openPunchesDetail', { date: d.date ?? '' }),
          when: days === null ? '' : relative(days),
          cta: t('pending.openPunchesCta'),
        }
      case 'leave_requests':
        return {
          title: t('pending.leaveTitle', { count: item.count }),
          detail: t('pending.leaveDetail'),
          when: days === null ? '' : t('pending.leaveOldest', { when: relative(days).toLowerCase() }),
          cta: t('pending.leaveCta'),
        }
      case 'payroll_run':
        return {
          title: d.period ? t('pending.runTitle', { label: runLabel(d.period) }) : item.title,
          detail: d.runStatus === 'edited' ? t('pending.runDetailEdited') : t('pending.runDetailDraft'),
          when:
            days === null ? '' : days < 0 ? t('pending.payOverdue') : days === 0 ? t('pending.payToday') : t('pending.payInDays', { count: days }),
          cta: t('pending.runCta'),
        }
      case 'corrections':
        return {
          title: t('pending.correctionsTitle', { count: item.count }),
          detail: t('pending.correctionsDetail'),
          when: '',
          cta: t('pending.correctionsCta'),
        }
      case 'terminations':
        return {
          title: t('pending.terminationsTitle', { count: item.count }),
          detail: t('pending.terminationsDetail'),
          when: days === null ? '' : relative(days),
          cta: t('pending.terminationsCta'),
        }
    }
  }

  const calendar = (ev: CalendarEvent) => {
    const d = ev.data
    if (!d) return { title: ev.title, subtitle: ev.subtitle }
    switch (ev.kind) {
      case 'payment':
        return {
          title: t('calendar.paymentTitle'),
          subtitle: t('calendar.paymentSubtitle', { start: d.periodStart ?? '', end: d.periodEnd ?? '' }),
        }
      case 'holiday':
        // Holiday names come from the company's own calendar: shown as stored.
        return { title: d.name || t('calendar.holiday'), subtitle: t('calendar.holiday') }
      case 'anniversary':
        return {
          title: t('calendar.anniversaryTitle', { name: d.name ?? '' }),
          subtitle: t('calendar.anniversarySubtitle', { count: d.years ?? 0 }),
        }
      case 'termination':
        return { title: t('calendar.terminationTitle', { name: d.name ?? '' }), subtitle: t('calendar.terminationSubtitle') }
    }
  }

  return { t, locale, date, number, relative, runLabel, pending, calendar }
}
