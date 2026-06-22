interface ArticleCountPipsProps {
  count: number
  max?: number
  activeClassName?: string
}

export default function ArticleCountPips({
  count,
  max = 12,
  activeClassName = 'bg-sky-400/90 shadow-[0_0_8px_rgba(56,189,248,0.6)]',
}: ArticleCountPipsProps) {
  const slots = Math.min(Math.max(count, 1), max)

  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`${count} artículos`}>
      {Array.from({ length: slots }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-4 rounded-full transition-all duration-300 ${
            i < count ? activeClassName : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}
