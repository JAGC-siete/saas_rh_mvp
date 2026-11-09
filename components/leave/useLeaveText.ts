import { useTranslations } from 'next-intl'
import type { LeaveRequest, LeaveType } from '../../lib/types/leave'

const SUMMARY_KEYS = ['presente', 'ausente', 'permiso_pagado', 'sin_datos'] as const

/** Leave labels in the admin's language (the Spanish helpers in leaveUtils stay for sorting/legacy callers). */
export function useLeaveText() {
  const t = useTranslations('leave')
  return {
    t,
    status: (status: string) =>
      status === 'pending'
        ? t('status.pending')
        : status === 'approved'
          ? t('status.approved')
          : status === 'cancelled'
            ? t('status.cancelled')
            : t('status.rejected'),
    summary: (s: string) =>
      (SUMMARY_KEYS as readonly string[]).includes(s) ? t(`summary.${s as (typeof SUMMARY_KEYS)[number]}`) : s,
    duration: (r: LeaveRequest) => {
      if (r.duration_type === 'hours') {
        return r.is_half_day ? t('duration.halfDay') : t('duration.hours', { count: r.duration_hours || 8 })
      }
      return t('duration.days', { count: r.days_requested })
    },
    // Leave type names are company data and stay as stored.
    typeName: (r: LeaveRequest, types: LeaveType[]) =>
      r.leave_type?.name || types.find((x) => x.id === r.leave_type_id)?.name || t('typeNotFound'),
  }
}
