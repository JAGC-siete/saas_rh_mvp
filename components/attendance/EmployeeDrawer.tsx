import { useState, useEffect } from 'react'
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
  /** Período del filtro del dashboard (ej. "de Hoy", "de esta Semana") — no está hardcodeado, viene del preset. */
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

  if (!open) return null

  const rawDept = employeeData?.departments
  const department = Array.isArray(rawDept) ? rawDept[0] : rawDept
  const workSchedule = employeeData?.work_schedules

  return (
    <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border-l border-white/10 shadow-2xl overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-900/95 border-b border-white/10 p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{name}</h2>
              {employeeData?.employee_code && (
                <p className="text-sm text-gray-400">Código: {employeeData.employee_code}</p>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department/Team */}
            {department && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <BriefcaseIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Departamento</p>
                    <p className="text-white font-semibold">{department.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Role */}
            {employeeData?.role && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <IdentificationIcon className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Rol</p>
                    <p className="text-white font-semibold">{employeeData.role}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Expected Check-In Time */}
            {schedule?.expectedCheckIn && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <ClockIcon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Horario Esperado</p>
                    <p className="text-white font-semibold">{schedule.expectedCheckIn}</p>
                    {schedule.scheduleName && (
                      <p className="text-xs text-gray-400 mt-1">{schedule.scheduleName}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Average */}
            {stats && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Promedio Histórico</p>
                    <p className="text-white font-semibold">{stats.attendanceAverage} asistencia</p>
                    <p className="text-xs text-gray-400 mt-1">{stats.presentDays} de {stats.totalDays} días</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Schedule Details */}
          {workSchedule && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-emerald-400" />
                Detalles del Horario
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {workSchedule.monday_start && (
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-gray-400">Lunes</span>
                    <span className="text-white font-medium">{workSchedule.monday_start} - {workSchedule.monday_end}</span>
                  </div>
                )}
                {workSchedule.tuesday_start && (
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-gray-400">Martes</span>
                    <span className="text-white font-medium">{workSchedule.tuesday_start} - {workSchedule.tuesday_end}</span>
                  </div>
                )}
                {workSchedule.wednesday_start && (
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-gray-400">Miércoles</span>
                    <span className="text-white font-medium">{workSchedule.wednesday_start} - {workSchedule.wednesday_end}</span>
                  </div>
                )}
                {workSchedule.thursday_start && (
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-gray-400">Jueves</span>
                    <span className="text-white font-medium">{workSchedule.thursday_start} - {workSchedule.thursday_end}</span>
                  </div>
                )}
                {workSchedule.friday_start && (
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-gray-400">Viernes</span>
                    <span className="text-white font-medium">{workSchedule.friday_start} - {workSchedule.friday_end}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline: período viene del filtro del dashboard (preset), no está hardcodeado */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <CalendarDaysIcon className="h-6 w-6 text-gray-400 shrink-0" aria-hidden />
                Historial{periodLabel ? ` ${periodLabel}` : ''}
              </h3>
              {rawPunches.length > 0 && (
                <div className="flex rounded-lg border border-white/15 overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setHistoryTab('consolidated')}
                    className={`px-3 py-1.5 font-medium ${
                      historyTab === 'consolidated' ? 'bg-brand-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Consolidado
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('device')}
                    className={`px-3 py-1.5 font-medium ${
                      historyTab === 'device' ? 'bg-brand-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Marcas reloj ({rawPunches.length})
                  </button>
                </div>
              )}
            </div>

            {historyTab === 'device' && rawPunches.length > 0 ? (
              <div className="space-y-2">
                {rawPunches.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-cyan-500/30 transition-colors"
                  >
                    <p className="text-white font-medium">Marca biométrica</p>
                    <p className="text-sm text-gray-400">{formatDateTimeForHonduras(p.ts_utc)}</p>
                    {p.local_date && <p className="text-xs text-gray-500 mt-1">Día local: {p.local_date}</p>}
                    {p.device_id && <p className="text-xs text-gray-500">Dispositivo: {p.device_id}</p>}
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-xl p-8 text-center border-2 border-dashed border-white/20 bg-white/5">
                <p className="text-gray-400 font-medium">No hay registros consolidados en este período</p>
                <p className="text-sm text-gray-500 mt-1">Usa la pestaña de marcas del reloj si hay eventos crudos.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((ev, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-brand-500/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`p-2 rounded-lg ${
                            ev.event_type.toLowerCase().includes('in')
                              ? 'bg-emerald-500/20'
                              : 'bg-red-500/20'
                          }`}
                          aria-hidden
                        >
                          {ev.event_type.toLowerCase().includes('in') ? (
                            <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <ArrowRightStartOnRectangleIcon className="h-5 w-5 text-red-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium">{ev.event_type}</p>
                          <p className="text-sm text-gray-400">{formatDateTimeForHonduras(ev.ts_local)}</p>
                          {ev.source && (
                            <p className="text-xs text-gray-500 mt-1">Fuente: {ev.source}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {ev.justification && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-sm text-gray-300">{ev.justification}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
