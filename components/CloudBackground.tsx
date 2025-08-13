import React from 'react'

export default function CloudBackground(): JSX.Element {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* L1 - Far Layer: Very subtle, slow drift */}
      <div className="cloud-layer-1 absolute inset-0">
        {[...Array(25)].map((_, i) => (
          <div
            key={`cloud-l1-${i}`}
            className="absolute animate-cloud-drift-slow"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${8 + Math.random() * 12}px`,
              height: `${6 + Math.random() * 8}px`,
              animationDelay: `${Math.random() * 30}s`,
              animationDuration: `${120 + Math.random() * 60}s`,
              opacity: 0.15 + Math.random() * 0.08
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
        {[...Array(35)].map((_, i) => (
          <div
            key={`cloud-l2-${i}`}
            className="absolute animate-cloud-drift-medium animate-cloud-twinkle-subtle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${12 + Math.random() * 16}px`,
              height: `${8 + Math.random() * 12}px`,
              animationDelay: `${Math.random() * 25}s`,
              animationDuration: `${90 + Math.random() * 45}s`,
              opacity: 0.2 + Math.random() * 0.1
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
        {[...Array(20)].map((_, i) => (
          <div
            key={`cloud-l3-${i}`}
            className="absolute animate-cloud-drift-fast"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${16 + Math.random() * 20}px`,
              height: `${12 + Math.random() * 16}px`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${60 + Math.random() * 30}s`,
              opacity: 0.25 + Math.random() * 0.1
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


