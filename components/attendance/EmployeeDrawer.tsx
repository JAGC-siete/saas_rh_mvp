interface TimelineEvent {
  ts_local: string
  event_type: string
  source?: string
  justification?: string | null
}

interface EmployeeDrawerProps {
  open: boolean
  onClose: () => void
  name: string
  events: TimelineEvent[]
}

export default function EmployeeDrawer({ open, onClose, name, events }: EmployeeDrawerProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-gray-900 p-4 overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-semibold">{name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">Cerrar</button>
        </div>
        <ul className="space-y-2">
          {events.map((ev, idx) => (
            <li key={idx} className="bg-gray-800 rounded p-2 text-sm text-gray-100">
              <div className="flex justify-between">
                <span>{new Date(ev.ts_local).toLocaleString('es-HN')}</span>
                <span>{ev.event_type}</span>
              </div>
              {ev.justification && (
                <div className="text-xs text-gray-400">{ev.justification}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
