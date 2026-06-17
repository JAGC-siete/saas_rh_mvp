interface ProgressIndicatorProps {
  progress: number
  className?: string
}

export default function ProgressIndicator({ progress, className = '' }: ProgressIndicatorProps) {
  const clamped = Math.min(100, Math.max(0, progress))

  return (
    <div className={`w-full h-0.5 bg-white/10 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-brand-400 rounded-full transition-[width] duration-100 ease-linear"
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
