import { Input } from '../ui/input'

export function CyclePicker({
  valueStart,
  valueEnd,
  onChangeStart,
  onChangeEnd,
}: {
  valueStart: string
  valueEnd: string
  // eslint-disable-next-line no-unused-vars
  onChangeStart: (value: string) => void
  // eslint-disable-next-line no-unused-vars
  onChangeEnd: (value: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Input
        type="date"
        value={valueStart}
        onChange={(e) => onChangeStart(e.target.value)}
        className="border-white/20 bg-white/10 text-white"
      />
      <Input
        type="date"
        value={valueEnd}
        onChange={(e) => onChangeEnd(e.target.value)}
        className="border-white/20 bg-white/10 text-white"
      />
    </div>
  )
}

