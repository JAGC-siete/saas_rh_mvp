import { useEffect, useState } from 'react'

export function useScrollThreshold(ratio = 0.2): boolean {
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) {
        setPassed(false)
        return
      }
      setPassed(window.scrollY / docHeight >= ratio)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [ratio])

  return passed
}

export function useScrollY(threshold = 50): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return scrolled
}
