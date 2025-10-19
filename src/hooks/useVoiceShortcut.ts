'use client'

import { useEffect } from 'react'

export function useVoiceShortcut(onActivate: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Press 'M' to activate (not in input fields)
      if (e.key === 'm' &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        onActivate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onActivate])
}
