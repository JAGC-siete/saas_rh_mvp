import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AbsenceTable from './AbsenceTable'
import ArrivalTable from './ArrivalTable'
import OutsideScheduleTable from './OutsideScheduleTable'
import type { AttendanceRow } from '../../lib/hooks/useAttendanceData'
import type { KpiFilter } from '../../lib/attendance/kpi-filter'
import { kpiFilterToTab, kpiFilterToSeverity } from '../../lib/attendance/kpi-filter'

type TabId = 'absent' | 'arrivals' | 'outside'

interface AttendanceTablesSectionProps {
  absent: AttendanceRow[]
  early: AttendanceRow[]
  late: AttendanceRow[]
  outsideSchedule: AttendanceRow[]
  presetLabel: string
  onSelectEmployee: (_employeeId: string, _employeeName: string) => void
  kpiFilter?: KpiFilter
}

export default function AttendanceTablesSection({
  absent,
  early,
  late,
  outsideSchedule,
  presetLabel,
  onSelectEmployee,
  kpiFilter = 'all',
}: AttendanceTablesSectionProps) {
  const mappedTab = kpiFilterToTab(kpiFilter)
  const [tab, setTab] = useState<TabId>(mappedTab ?? 'absent')

  useEffect(() => {
    if (mappedTab) setTab(mappedTab)
  }, [mappedTab, kpiFilter])

  const externalSeverity = kpiFilterToSeverity(kpiFilter)

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'absent', label: 'Ausentes', count: absent.length },
    { id: 'arrivals', label: 'Presentes', count: early.length + late.length },
    { id: 'outside', label: 'Fuera de horario', count: outsideSchedule.length },
  ]

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
            onClick={() => setTab(t.id)}
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
            {tab === 'absent' && (
              <div id="attendance-panel-absent" role="tabpanel" aria-labelledby="attendance-tab-absent">
                <AbsenceTable
                  data={absent}
                  title={`Ausentes ${presetLabel}`}
                  onSelect={onSelectEmployee}
                />
              </div>
            )}
            {tab === 'arrivals' && (
              <div id="attendance-panel-arrivals" role="tabpanel" aria-labelledby="attendance-tab-arrivals">
                <ArrivalTable
                  earlyData={early}
                  lateData={late}
                  title={`Presentes ${presetLabel}`}
                  onSelect={onSelectEmployee}
                  externalSeverityFilter={externalSeverity}
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
