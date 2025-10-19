'use client'

import { createContext, useContext } from 'react'

interface VoiceModalContextType {
  isModalOpen: boolean
}

const VoiceModalContext = createContext<VoiceModalContextType>({
  isModalOpen: false
})

export function useVoiceModal() {
  return useContext(VoiceModalContext)
}

export { VoiceModalContext }
