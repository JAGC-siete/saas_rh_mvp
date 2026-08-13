import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AbsenceTable from './AbsenceTable'
import ArrivalTable from './ArrivalTable'
import OutsideScheduleTable from './OutsideScheduleTable'
import type { AttendanceRow } from '../../lib/hooks/useAttendanceData'
import type { AttendanceListTab, KpiFilter } from '../../lib/attendance/kpi-filter'
import {
  isLateArrival,
  kpiFilterToTab,
  tabToKpiFilter,
} from '../../lib/attendance/kpi-filter'

interface AttendanceTablesSectionProps {
  absent: AttendanceRow[]
  early: AttendanceRow[]
  late: AttendanceRow[]
  outsideSchedule: AttendanceRow[]
  presetLabel: string
  preset?: string
  onSelectEmployee: (_employeeId: string, _employeeName: string) => void
  kpiFilter?: KpiFilter
  onKpiFilterChange?: (filter: KpiFilter) => void
}

export default function AttendanceTablesSection({
  absent,
  early,
  late,
  outsideSchedule,
  presetLabel,
  preset = 'today',
  onSelectEmployee,
  kpiFilter = 'all',
  onKpiFilterChange,
}: AttendanceTablesSectionProps) {
  const showAbsenceDates = preset !== 'today'
  const mappedTab = kpiFilterToTab(kpiFilter)
  const [tab, setTab] = useState<AttendanceListTab>(mappedTab ?? 'presentes')

  useEffect(() => {
    if (mappedTab) setTab(mappedTab)
  }, [mappedTab, kpiFilter])

  const lateOnly = useMemo(() => late.filter(isLateArrival), [late])
  const presentCount = early.length + late.length

  const tabs: { id: AttendanceListTab; label: string; count: number }[] = [
    { id: 'temprano', label: 'Temprano', count: early.length },
    { id: 'tarde', label: 'Tarde', count: lateOnly.length },
    { id: 'presentes', label: 'Presentes', count: presentCount },
    { id: 'ausentes', label: 'Ausentes', count: absent.length },
    { id: 'outside', label: 'Fuera de horario', count: outsideSchedule.length },
  ]

  const selectTab = (next: AttendanceListTab) => {
    setTab(next)
    onKpiFilterChange?.(tabToKpiFilter(next))
  }

  return (
    <motion.div
      layout
      className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div
        className="flex flex-wrap gap-1 p-2 border-b border-white/10"
        role="tablist"
        aria-label="Listas de asistencia"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            id={`attendance-tab-${t.id}`}
            aria-controls={`attendance-panel-${t.id}`}
            onClick={() => selectTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            {t.label}
            <span className="ml-1.5 tabular-nums opacity-80">({t.count})</span>
          </button>
        ))}
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tab}-${kpiFilter}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {tab === 'temprano' && (
              <div id="attendance-panel-temprano" role="tabpanel" aria-labelledby="attendance-tab-temprano">
                <ArrivalTable
                  earlyData={early}
                  lateData={[]}
                  title={`Temprano ${presetLabel}`}
                  onSelect={onSelectEmployee}
                  externalSeverityFilter="early"
                />
              </div>
            )}
            {tab === 'tarde' && (
              <div id="attendance-panel-tarde" role="tabpanel" aria-labelledby="attendance-tab-tarde">
                <ArrivalTable
                  earlyData={[]}
                  lateData={lateOnly}
                  title={`Tarde ${presetLabel}`}
                  onSelect={onSelectEmployee}
                  externalSeverityFilter="late"
                />
              </div>
            )}
            {tab === 'presentes' && (
              <div id="attendance-panel-presentes" role="tabpanel" aria-labelledby="attendance-tab-presentes">
                <ArrivalTable
                  earlyData={early}
                  lateData={late}
                  title={`Presentes ${presetLabel}`}
                  onSelect={onSelectEmployee}
                  externalSeverityFilter="all"
                />
              </div>
            )}
            {tab === 'ausentes' && (
              <div id="attendance-panel-ausentes" role="tabpanel" aria-labelledby="attendance-tab-ausentes">
                <AbsenceTable
                  data={absent}
                  title={`Ausentes ${presetLabel}`}
                  onSelect={onSelectEmployee}
                  showDate={showAbsenceDates}
                />
              </div>
            )}
            {tab === 'outside' && (
              <div id="attendance-panel-outside" role="tabpanel" aria-labelledby="attendance-tab-outside">
                <OutsideScheduleTable
                  data={outsideSchedule}
                  title={`Marcaron fuera de horario ${presetLabel}`}
                  onSelect={onSelectEmployee}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
