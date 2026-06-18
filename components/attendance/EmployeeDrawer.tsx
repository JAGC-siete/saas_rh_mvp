import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDateTimeForHonduras } from '../../lib/timezone'
import {
  XMarkIcon,
  ClockIcon,
  ChartBarIcon,
  IdentificationIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ArrowRightStartOnRectangleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import type { AttendanceEmployeeDetail } from '../../lib/attendance/dashboard-types'

interface TimelineEvent {
  ts_local: string
  event_type: string
  source?: string
  justification?: string | null
}

export interface EmployeeDrawerRawPunch {
  id: string
  ts_utc: string
  device_id?: string | null
  event_uid?: string | null
  local_date?: string | null
}

interface EmployeeDrawerProps {
  open: boolean
  onClose: () => void
  name: string
  events: TimelineEvent[]
  periodLabel?: string
  rawPunches?: EmployeeDrawerRawPunch[]
  employeeData?: AttendanceEmployeeDetail
  stats?: {
    attendanceAverage: string
    presentDays: number
    totalDays: number
  }
  schedule?: {
    expectedCheckIn: string | null
    scheduleName: string | null
  }
}

function isAnomalyEvent(ev: TimelineEvent): boolean {
  const t = ev.event_type.toLowerCase()
  return t.includes('anomal') || t.includes('late') || t.includes('oor') || t.includes('tarde')
}

export default function EmployeeDrawer({
  open,
  onClose,
  name,
  events,
  periodLabel,
  rawPunches = [],
  employeeData,
  stats,
  schedule,
}: EmployeeDrawerProps) {
  const [historyTab, setHistoryTab] = useState<'consolidated' | 'device'>('consolidated')

  useEffect(() => {
    if (rawPunches.length === 0) setHistoryTab('consolidated')
  }, [rawPunches.length, name])

  const rawDept = employeeData?.departments
  const department = Array.isArray(rawDept) ? rawDept[0] : rawDept
  const workSchedule = employeeData?.work_schedules
  const employeeId = employeeData?.id

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Detalle de ${name}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl z-50 bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-l border-white/10 shadow-2xl flex flex-col backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-gray-900/90 border-b border-white/10 p-6 backdrop-blur-md">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{name}</h2>
                  {employeeData?.employee_code && (
                    <p className="text-sm text-gray-400">Código: {employeeData.employee_code}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Cerrar"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-28">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {department && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3">
                      <BriefcaseIcon className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-xs text-gray-500">Departamento</p>
                        <p className="text-white font-medium text-sm">{department.name}</p>
                      </div>
                    </div>
                  </div>
                )}
                {employeeData?.role && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3">
                      <IdentificationIcon className="h-5 w-5 text-purple-400" />
                      <div>
                        <p className="text-xs text-gray-500">Rol</p>
                        <p className="text-white font-medium text-sm">{employeeData.role}</p>
                      </div>
                    </div>
                  </div>
                )}
                {schedule?.expectedCheckIn && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3">
                      <ClockIcon className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-xs text-gray-500">Horario esperado</p>
                        <p className="text-white font-medium text-sm">{schedule.expectedCheckIn}</p>
                      </div>
                    </div>
                  </div>
                )}
                {stats && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3">
                      <ChartBarIcon className="h-5 w-5 text-amber-400" />
                      <div>
                        <p className="text-xs text-gray-500">Promedio histórico</p>
                        <p className="text-white font-medium text-sm">
                          {stats.attendanceAverage} · {stats.presentDays}/{stats.totalDays} días
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {workSchedule && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-sm">
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-emerald-400" />
                    Horario semanal
                  </h3>
                  <div className="grid grid-cols-1 gap-1 text-gray-400">
                    {[
                      ['Lun', workSchedule.monday_start, workSchedule.monday_end],
                      ['Mar', workSchedule.tuesday_start, workSchedule.tuesday_end],
                      ['Mié', workSchedule.wednesday_start, workSchedule.wednesday_end],
                      ['Jue', workSchedule.thursday_start, workSchedule.thursday_end],
                      ['Vie', workSchedule.friday_start, workSchedule.friday_end],
                    ]
                      .filter(([, s]) => s)
                      .map(([day, start, end]) => (
                        <div key={day as string} className="flex justify-between">
                          <span>{day}</span>
                          <span className="text-gray-300">
                            {start} – {end}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Visual timeline */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                    Historial{periodLabel ? ` ${periodLabel}` : ''}
                  </h3>
                  {rawPunches.length > 0 && (
                    <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => setHistoryTab('consolidated')}
                        className={`px-3 py-1.5 ${
                          historyTab === 'consolidated' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        Consolidado
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTab('device')}
                        className={`px-3 py-1.5 ${
                          historyTab === 'device' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        Reloj ({rawPunches.length})
                      </button>
                    </div>
                  )}
                </div>

                {historyTab === 'device' && rawPunches.length > 0 ? (
                  <div className="relative pl-6 space-y-4">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" aria-hidden />
                    {rawPunches.map((p) => (
                      <div key={p.id} className="relative flex gap-4">
                        <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] ring-4 ring-gray-900" />
                        <div className="flex-1 pb-2">
                          <p className="text-white text-sm font-medium">Marca biométrica</p>
                          <p className="text-xs text-gray-400">{formatDateTimeForHonduras(p.ts_utc)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">Sin registros en este período</p>
                ) : (
                  <div className="relative pl-6 space-y-1">
                    <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-brand-500/40 via-white/10 to-transparent" aria-hidden />
                    {events.map((ev, idx) => {
                      const isIn = ev.event_type.toLowerCase().includes('in')
                      const anomaly = isAnomalyEvent(ev)
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="relative flex gap-4 py-3"
                        >
                          <div
                            className={`absolute -left-6 top-4 w-3 h-3 rounded-full ring-4 ring-gray-900 ${
                              anomaly
                                ? 'bg-orange-400 animate-pulse-slow shadow-[0_0_8px_rgba(251,146,60,0.6)]'
                                : isIn
                                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                                  : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.4)]'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              {isIn ? (
                                <CheckCircleIcon className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                              ) : (
                                <ArrowRightStartOnRectangleIcon className="h-4 w-4 text-rose-300 mt-0.5 flex-shrink-0" />
                              )}
                              <div>
                                <p className="text-white text-sm font-medium">{ev.event_type}</p>
                                <p className="text-xs text-gray-500">{formatDateTimeForHonduras(ev.ts_local)}</p>
                                {ev.justification && (
                                  <p className="text-xs text-gray-400 mt-1 italic">{ev.justification}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions — sticky glass footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-gray-900/70 backdrop-blur-md">
              <div className="flex gap-3">
                <Link
                  href={employeeId ? `/app/attendance/corrections?employee_id=${employeeId}` : '/app/attendance/corrections'}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600/90 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Corregir
                </Link>
                <Link
                  href="/app/attendance/daily-close"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium border border-white/15 transition-colors"
                >
                  <ClockIcon className="h-4 w-4" />
                  Cierre diario
                </Link>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
