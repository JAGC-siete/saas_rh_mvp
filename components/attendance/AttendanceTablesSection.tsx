import { useState } from 'react'
import AbsenceTable from './AbsenceTable'
import ArrivalTable from './ArrivalTable'
import OutsideScheduleTable from './OutsideScheduleTable'
import type { AttendanceRow } from '../../lib/hooks/useAttendanceData'

type TabId = 'absent' | 'arrivals' | 'outside'

interface AttendanceTablesSectionProps {
  absent: AttendanceRow[]
  early: AttendanceRow[]
  late: AttendanceRow[]
  outsideSchedule: AttendanceRow[]
  presetLabel: string
  onSelectEmployee: (id: string, name: string) => void
}

export default function AttendanceTablesSection({
  absent,
  early,
  late,
  outsideSchedule,
  presetLabel,
  onSelectEmployee,
}: AttendanceTablesSectionProps) {
  const [tab, setTab] = useState<TabId>('absent')

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'absent', label: 'Ausentes', count: absent.length },
    { id: 'arrivals', label: 'Llegadas', count: early.length + late.length },
    { id: 'outside', label: 'Fuera de horario', count: outsideSchedule.length },
  ]

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
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
        <div
          id="attendance-panel-absent"
          role="tabpanel"
          aria-labelledby="attendance-tab-absent"
          hidden={tab !== 'absent'}
        >
          {tab === 'absent' && (
            <AbsenceTable
              data={absent}
              title={`Ausentes ${presetLabel}`}
              onSelect={onSelectEmployee}
            />
          )}
        </div>
        <div
          id="attendance-panel-arrivals"
          role="tabpanel"
          aria-labelledby="attendance-tab-arrivals"
          hidden={tab !== 'arrivals'}
        >
          {tab === 'arrivals' && (
            <ArrivalTable
              earlyData={early}
              lateData={late}
              title={`Llegadas ${presetLabel}`}
              onSelect={onSelectEmployee}
            />
          )}
        </div>
        <div
          id="attendance-panel-outside"
          role="tabpanel"
          aria-labelledby="attendance-tab-outside"
          hidden={tab !== 'outside'}
        >
          {tab === 'outside' && (
            <OutsideScheduleTable
              data={outsideSchedule}
              title={`Marcaron fuera de horario ${presetLabel}`}
              onSelect={onSelectEmployee}
            />
          )}
        </div>
      </div>
    </div>
  )
}
