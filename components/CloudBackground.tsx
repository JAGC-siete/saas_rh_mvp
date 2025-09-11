import React, { useState, useEffect } from 'react'

export default function CloudBackground() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Predefined positions to avoid SSR hydration issues
  const cloudPositions = [
    { left: 10, top: 20, width: 12, height: 8, delay: 0, duration: 120, opacity: 0.18 },
    { left: 25, top: 35, width: 15, height: 10, delay: 5, duration: 140, opacity: 0.16 },
    { left: 40, top: 15, width: 10, height: 7, delay: 10, duration: 130, opacity: 0.17 },
    { left: 60, top: 40, width: 18, height: 12, delay: 15, duration: 150, opacity: 0.19 },
    { left: 80, top: 25, width: 14, height: 9, delay: 20, duration: 135, opacity: 0.16 },
    { left: 15, top: 60, width: 16, height: 11, delay: 25, duration: 145, opacity: 0.18 },
    { left: 35, top: 70, width: 13, height: 8, delay: 30, duration: 125, opacity: 0.17 },
    { left: 55, top: 55, width: 17, height: 12, delay: 35, duration: 155, opacity: 0.19 },
    { left: 75, top: 65, width: 11, height: 7, delay: 40, duration: 140, opacity: 0.16 },
    { left: 90, top: 45, width: 19, height: 13, delay: 45, duration: 160, opacity: 0.20 }
  ]

  if (!isClient) {
    return <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" />
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* L1 - Far Layer: Very subtle, slow drift */}
      <div className="cloud-layer-1 absolute inset-0">
        {cloudPositions.map((pos, i) => (
          <div
            key={`cloud-l1-${i}`}
            className="absolute animate-cloud-drift-slow"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              width: `${pos.width}px`,
              height: `${pos.height}px`,
              animationDelay: `${pos.delay}s`,
              animationDuration: `${pos.duration}s`,
              opacity: pos.opacity
            }}
          >
            <svg viewBox="0 0 100 60" className="w-full h-full">
              <path
                d="M10,30 Q25,10 40,30 Q55,50 70,30 Q85,10 90,30 Q95,50 90,30 Q85,10 70,30 Q55,50 40,30 Q25,10 10,30 Z"
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* L2 - Medium Layer: Medium density, subtle twinkle */}
      <div className="cloud-layer-2 absolute inset-0">
        {cloudPositions.slice(0, 8).map((pos, i) => (
          <div
            key={`cloud-l2-${i}`}
            className="absolute animate-cloud-drift-medium animate-cloud-twinkle-subtle"
            style={{
              left: `${pos.left + 5}%`,
              top: `${pos.top + 10}%`,
              width: `${pos.width + 4}px`,
              height: `${pos.height + 3}px`,
              animationDelay: `${pos.delay + 2}s`,
              animationDuration: `${pos.duration - 20}s`,
              opacity: pos.opacity + 0.05
            }}
          >
            <svg viewBox="0 0 100 60" className="w-full h-full">
              <path
                d="M5,30 Q20,5 35,30 Q50,55 65,30 Q80,5 95,30 Q100,55 95,30 Q80,5 65,30 Q50,55 35,30 Q20,5 5,30 Z"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* L3 - Close Layer: Low density, minimal parallax */}
      <div className="cloud-layer-3 absolute inset-0">
        {cloudPositions.slice(0, 5).map((pos, i) => (
          <div
            key={`cloud-l3-${i}`}
            className="absolute animate-cloud-drift-fast"
            style={{
              left: `${pos.left + 10}%`,
              top: `${pos.top + 15}%`,
              width: `${pos.width + 8}px`,
              height: `${pos.height + 6}px`,
              animationDelay: `${pos.delay + 4}s`,
              animationDuration: `${pos.duration - 40}s`,
              opacity: pos.opacity + 0.1
            }}
          >
            <svg viewBox="0 0 100 60" className="w-full h-full">
              <path
                d="M0,30 Q15,0 30,30 Q45,60 60,30 Q75,0 90,30 Q100,60 90,30 Q75,0 60,30 Q45,60 30,30 Q15,0 0,30 Z"
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}


