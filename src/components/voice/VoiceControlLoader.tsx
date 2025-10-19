'use client'

import dynamic from 'next/dynamic'

// Lazy load GlobalVoiceControl since it's not critical for initial render
const GlobalVoiceControl = dynamic(() => import("@/components/voice/GlobalVoiceControl").then(mod => ({ default: mod.GlobalVoiceControl })), { ssr: false })

export function VoiceControlLoader() {
  return <GlobalVoiceControl />
}
