import {
  DAY_KEYS,
  type DayKey,
  type LegacyScheduleColumns,
  type ScheduleEditorFormState,
  createDefaultScheduleFormState,
  formatDayConfigSummary,
  legacyScheduleToShiftConfig,
  shiftConfigToFormState,
  validateScheduleForm,
  weekFormToShiftConfig,
} from '../lib/attendance/shift-config'
import { Button } from './ui/button'
import { Input } from './ui/input'

const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

type WorkScheduleEditorProps = {
  form: ScheduleEditorFormState
  onChange: (form: ScheduleEditorFormState) => void
  loading?: boolean
  isEditing: boolean
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

function updateDay(
  form: ScheduleEditorFormState,
  dayKey: DayKey,
  patch: Partial<ScheduleEditorFormState['days'][DayKey]>
): ScheduleEditorFormState {
  return {
    ...form,
    days: {
      ...form.days,
      [dayKey]: { ...form.days[dayKey], ...patch },
    },
  }
}

export function scheduleFromRow(row: LegacyScheduleColumns & { name?: string; timezone?: string | null }): ScheduleEditorFormState {
  return shiftConfigToFormState(row)
}

export function emptyScheduleForm(): ScheduleEditorFormState {
  return createDefaultScheduleFormState()
}

export { validateScheduleForm, weekFormToShiftConfig }

export default function WorkScheduleEditor({
  form,
  onChange,
  loading = false,
  isEditing,
  onSubmit,
  onCancel,
}: WorkScheduleEditorProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-1">Nombre del Horario *</label>
          <Input
            type="text"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            required
            placeholder="Ej: Horario A 09:00-17:00"
            className="input-glass text-white placeholder:text-white/70"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Duración del Almuerzo (minutos, jornada continua)
          </label>
          <Input
            type="number"
            value={form.break_duration}
            onChange={(e) => onChange({ ...form, break_duration: parseInt(e.target.value, 10) || 0 })}
            min={0}
            className="input-glass text-white placeholder:text-white/70"
          />
          <p className="text-xs text-gray-400 mt-1">
            Valor por defecto para días continuos. En turno partido el descanso es el intervalo entre bloques.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h5 className="font-medium text-white">Horarios por Día</h5>
        <div className="hidden md:grid md:grid-cols-[120px_100px_100px_1fr] gap-3 px-2 text-xs text-gray-400 uppercase tracking-wide">
          <span>Día</span>
          <span>Día libre</span>
          <span>Turno partido</span>
          <span>Horario</span>
        </div>

        <div className="glass p-4 rounded-lg border border-white/10 space-y-4">
          {DAY_KEYS.map((dayKey) => {
            const day = form.days[dayKey]
            const disabled = day.isOff

            return (
              <div
                key={dayKey}
                className="grid grid-cols-1 md:grid-cols-[120px_100px_100px_1fr] gap-3 items-start py-3 border-b border-white/5 last:border-0"
              >
                <span className="text-sm font-medium text-white flex items-center pt-2">
                  <span className="w-2 h-2 rounded-full bg-brand-400 mr-2 shrink-0" />
                  {DAY_LABELS[dayKey]}
                </span>

                <label className="flex items-center gap-2 text-sm text-gray-200 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.isOff}
                    onChange={(e) => {
                      const isOff = e.target.checked
                      onChange(
                        updateDay(form, dayKey, {
                          isOff,
                          isSplit: isOff ? false : day.isSplit,
                        })
                      )
                    }}
                    className="h-4 w-4"
                  />
                  <span className="md:hidden text-xs text-gray-400">Libre</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-200 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.isSplit}
                    disabled={disabled}
                    onChange={(e) => onChange(updateDay(form, dayKey, { isSplit: e.target.checked }))}
                    className="h-4 w-4 disabled:opacity-40"
                  />
                  <span className="md:hidden text-xs text-gray-400">Partido</span>
                </label>

                <div className="space-y-2">
                  {disabled ? (
                    <p className="text-sm text-gray-400 italic pt-2">Día libre — sin horario laboral</p>
                  ) : day.isSplit ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <label className="text-xs text-gray-300">
                        Entrada mañana
                        <Input
                          type="time"
                          value={day.m_start}
                          onChange={(e) => onChange(updateDay(form, dayKey, { m_start: e.target.value }))}
                          className="mt-1 input-glass text-white"
                        />
                      </label>
                      <label className="text-xs text-gray-300">
                        Salida mañana
                        <Input
                          type="time"
                          value={day.m_end}
                          onChange={(e) => onChange(updateDay(form, dayKey, { m_end: e.target.value }))}
                          className="mt-1 input-glass text-white"
                        />
                      </label>
                      <label className="text-xs text-gray-300">
                        Entrada tarde
                        <Input
                          type="time"
                          value={day.a_start}
                          onChange={(e) => onChange(updateDay(form, dayKey, { a_start: e.target.value }))}
                          className="mt-1 input-glass text-white"
                        />
                      </label>
                      <label className="text-xs text-gray-300">
                        Salida tarde
                        <Input
                          type="time"
                          value={day.a_end}
                          onChange={(e) => onChange(updateDay(form, dayKey, { a_end: e.target.value }))}
                          className="mt-1 input-glass text-white"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="text-xs text-gray-300">
                        Entrada
                        <Input
                          type="time"
                          value={day.start}
                          onChange={(e) => onChange(updateDay(form, dayKey, { start: e.target.value }))}
                          className="mt-1 input-glass text-white"
                        />
                      </label>
                      <label className="text-xs text-gray-300">
                        Salida
                        <Input
                          type="time"
                          value={day.end}
                          onChange={(e) => onChange(updateDay(form, dayKey, { end: e.target.value }))}
                          className="mt-1 input-glass text-white"
                        />
                      </label>
                      <label className="text-xs text-gray-300">
                        Almuerzo (min, opcional)
                        <Input
                          type="number"
                          min={0}
                          placeholder={String(form.break_duration)}
                          value={day.breakMinutes}
                          onChange={(e) => onChange(updateDay(form, dayKey, { breakMinutes: e.target.value }))}
                          className="mt-1 input-glass text-white placeholder:text-white/50"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex space-x-3 pt-2 border-t border-white/10">
        <Button type="submit" disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white font-medium">
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-white/20 hover:bg-white/10 hover:border-white/30"
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

export function WorkScheduleCardSummary({ schedule }: { schedule: LegacyScheduleColumns & { name: string } }) {
  const config = legacyScheduleToShiftConfig(schedule)

  return (
    <div className="space-y-2 pt-3 border-t border-white/10">
      {DAY_KEYS.map((key) => {
        const summary = formatDayConfigSummary(config[key])
        const isOff = config[key]?.type === 'off'
        return (
          <div key={key} className="flex justify-between items-start gap-3 py-1">
            <span className="text-sm text-gray-300 font-medium shrink-0">{DAY_LABELS[key]}</span>
            <span className={`text-sm text-right ${isOff ? 'text-gray-500 italic' : 'text-white font-medium'}`}>
              {summary}
            </span>
          </div>
        )
      })}
      <div className="flex justify-between items-center py-1 pt-2 border-t border-white/5">
        <span className="text-xs text-gray-400">Almuerzo (continuo, default)</span>
        <span className="text-xs text-gray-300 font-medium">{schedule.break_duration ?? 60} min</span>
      </div>
    </div>
  )
}
