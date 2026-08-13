type FloatingChestSvgProps = {
  className?: string
}

/** Static SVG fallback — shown while canvas loads or when motion is reduced. */
export default function FloatingChestSvg({ className = '' }: FloatingChestSvgProps) {
  return (
    <svg
      viewBox="0 0 240 200"
      className={`h-full w-full drop-shadow-[0_14px_32px_rgba(180,120,40,0.5)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fc-body" x1="30" y1="95" x2="210" y2="185" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6E4520" />
          <stop offset="0.35" stopColor="#B07830" />
          <stop offset="0.7" stopColor="#D4A24C" />
          <stop offset="1" stopColor="#5C3818" />
        </linearGradient>
        <linearGradient id="fc-lid" x1="20" y1="20" x2="220" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5A2B" />
          <stop offset="0.5" stopColor="#E8C06A" />
          <stop offset="1" stopColor="#6B4423" />
        </linearGradient>
        <linearGradient id="fc-metal" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F5E6A8" />
          <stop offset="0.5" stopColor="#C9A04A" />
          <stop offset="1" stopColor="#8B6914" />
        </linearGradient>
        <radialGradient id="fc-glow" cx="50%" cy="50%" r="50%">
          <stop stopColor="#FDE68A" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#F59E0B" stopOpacity="0.4" />
          <stop offset="1" stopColor="#78350F" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="120" cy="138" rx="58" ry="22" fill="url(#fc-glow)" />

      <rect x="38" y="108" width="164" height="72" rx="7" fill="url(#fc-body)" stroke="#4A2E12" strokeWidth="2" />
      <path d="M38 120 H202" stroke="#3D2510" strokeWidth="1" opacity="0.4" />

      <rect x="38" y="108" width="14" height="72" rx="3" fill="#4A3010" opacity="0.5" />
      <rect x="188" y="108" width="14" height="72" rx="3" fill="#4A3010" opacity="0.5" />

      <circle cx="72" cy="144" r="14" fill="url(#fc-metal)" stroke="#5C3A1A" strokeWidth="1.5" />
      <ellipse cx="72" cy="144" rx="9" ry="7" fill="none" stroke="#4A3010" strokeWidth="2.5" />
      <circle cx="72" cy="144" r="3.5" fill="#3D2510" />

      <circle cx="120" cy="144" r="14" fill="url(#fc-metal)" stroke="#5C3A1A" strokeWidth="1.5" />
      <ellipse cx="120" cy="144" rx="9" ry="7" fill="none" stroke="#4A3010" strokeWidth="2.5" />
      <circle cx="120" cy="144" r="3.5" fill="#3D2510" />

      <circle cx="168" cy="144" r="14" fill="url(#fc-metal)" stroke="#5C3A1A" strokeWidth="1.5" />
      <ellipse cx="168" cy="144" rx="9" ry="7" fill="none" stroke="#4A3010" strokeWidth="2.5" />
      <circle cx="168" cy="144" r="3.5" fill="#3D2510" />

      <g transform="translate(120 108) rotate(-72) translate(-120 -78)">
        <rect x="32" y="48" width="176" height="52" rx="6" fill="url(#fc-lid)" stroke="#4A2E12" strokeWidth="2" />
        <path d="M32 60 H208" stroke="#3D2510" strokeWidth="1" opacity="0.35" />
      </g>

      <path
        d="M120 22 C108 22 100 32 100 44 C100 56 108 66 120 66 C132 66 140 56 140 44 C140 32 132 22 120 22 Z"
        fill="url(#fc-metal)"
        stroke="#5C3A1A"
        strokeWidth="1.5"
      />
      <path d="M120 66 V88" stroke="url(#fc-metal)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}
