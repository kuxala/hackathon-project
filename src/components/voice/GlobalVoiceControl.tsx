'use client'

import { useState } from 'react'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { useVoiceShortcut } from '@/hooks/useVoiceShortcut'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { VoiceModal } from './VoiceModal'
import { VoiceModalContext } from '@/contexts/VoiceModalContext'

const USE_MOCK_MODE = false

// Mock intent processor for testing
function mockProcessIntent(transcript: string) {
  const text = transcript.toLowerCase().trim()

  if (text.includes('dashboard') || text.includes('home')) {
    return {
      type: 'navigation',
      path: '/dashboard',
      voice_reply: 'Opening dashboard'
    }
  }

  if (text.includes('statement') || text.includes('upload')) {
    return {
      type: 'navigation',
      path: '/statements',
      voice_reply: 'Opening statements'
    }
  }

  if (text.includes('insight')) {
    return {
      type: 'navigation',
      path: '/dashboard/insights',
      voice_reply: 'Opening insights'
    }
  }

  if (text.includes('balance')) {
    return {
      type: 'query_result',
      data: { balance: 1316.23 },
      voice_reply: 'Your balance is one thousand three hundred sixteen lari'
    }
  }

  if (text.includes('transaction') || text.includes('recent') || text.includes('last')) {
    return {
      type: 'query_result',
      data: {
        transactions: [
          { id: 1, description: 'Glovo Food Delivery', amount: -42.50, date: '2025-01-18' },
          { id: 2, description: 'Salary Deposit', amount: 2500.00, date: '2025-01-17' },
          { id: 3, description: 'Netflix Subscription', amount: -15.99, date: '2025-01-16' },
          { id: 4, description: 'Grocery Store', amount: -87.32, date: '2025-01-15' },
          { id: 5, description: 'Gas Station', amount: -45.00, date: '2025-01-14' }
        ]
      },
      voice_reply: 'Here are your last 5 transactions'
    }
  }

  if (text.includes('spend') || text.includes('spent')) {
    return {
      type: 'query_result',
      data: { total_spending: 420.50 },
      voice_reply: 'You have spent four hundred twenty lari and fifty tetri'
    }
  }

  return {
    type: 'ai_reply',
    data: { message: transcript },
    voice_reply: 'I heard: ' + transcript
  }
}

export function GlobalVoiceControl() {
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  const { speak } = useTextToSpeech()

  const handleTranscript = async (text: string) => {
    setTranscript(text)
    setIsProcessing(true)

    try {
      let result

      if (USE_MOCK_MODE) {
        console.log('🎤 Voice command (MOCK MODE):', text)
        await new Promise(resolve => setTimeout(resolve, 500))
        result = mockProcessIntent(text)
      } else {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          speak('Please log in first')
          setIsProcessing(false)
          return
        }

        const response = await fetch('/api/intent', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transcript: text,
            userId: session.user.id
          })
        })

        result = await response.json()
      }

      console.log('🤖 Intent result:', result)
      setLastResult(result)

      if (result.voice_reply) {
        speak(result.voice_reply)
      }

      if (result.type === 'navigation' && result.path) {
        setTimeout(() => {
          router.push(result.path)
        }, 2000)
      } else if (result.type === 'query_result') {
        console.log('📊 Query results:', result.data)
      }

    } catch (error) {
      console.error('Voice command error:', error)
      speak('Sorry, something went wrong')
    } finally {
      setIsProcessing(false)
      setTimeout(() => {
        setTranscript('')
        setIsModalOpen(false) // Close modal after voice response
      }, 3000)
    }
  }

  const { isListening, isSupported, startListening } = useVoiceRecognition(handleTranscript)

  // Wrapper to open modal and start listening
  const activateVoice = () => {
    setIsModalOpen(true)
    startListening()
  }

  // Close modal handler
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTranscript('')
    setLastResult(null)
  }

  // Add global keyboard shortcut
  useVoiceShortcut(activateVoice)

  if (!isSupported) {
    return null // Don't show anything if not supported
  }

  return (
    <VoiceModalContext.Provider value={{ isModalOpen }}>
      <VoiceModal
        isOpen={isModalOpen}
        isListening={isListening}
        isProcessing={isProcessing}
        transcript={transcript}
        onClose={handleCloseModal}
      />
    </VoiceModalContext.Provider>
  )
}
