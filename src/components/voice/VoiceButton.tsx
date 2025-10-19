'use client'

import { useState } from 'react'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { useVoiceShortcut } from '@/hooks/useVoiceShortcut'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// SET TO TRUE FOR TESTING WITHOUT BACKEND
const USE_MOCK_MODE = false

// Mock intent processor for testing
function mockProcessIntent(transcript: string) {
  const text = transcript.toLowerCase().trim()

  // Navigation intents
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

  // Balance query
  if (text.includes('balance')) {
    return {
      type: 'query_result',
      data: { balance: 1316.23 },
      voice_reply: 'Your balance is one thousand three hundred sixteen lari'
    }
  }

  // Latest transactions
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

  // Spending summary
  if (text.includes('spend') || text.includes('spent')) {
    return {
      type: 'query_result',
      data: { total_spending: 420.50 },
      voice_reply: 'You have spent four hundred twenty lari and fifty tetri'
    }
  }

  // Fallback
  return {
    type: 'ai_reply',
    data: { message: transcript },
    voice_reply: 'I heard: ' + transcript
  }
}

export function VoiceButton() {
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const router = useRouter()
  const { speak } = useTextToSpeech()

  const handleTranscript = async (text: string) => {
    setTranscript(text)
    setIsProcessing(true)

    try {
      let result

      if (USE_MOCK_MODE) {
        // MOCK MODE - Test without backend
        console.log('🎤 Voice command (MOCK MODE):', text)
        await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API delay
        result = mockProcessIntent(text)
      } else {
        // REAL MODE - Call backend API
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
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

      // Speak response
      if (result.voice_reply) {
        speak(result.voice_reply)
      }

      // Handle intent type
      if (result.type === 'navigation' && result.path) {
        setTimeout(() => {
          router.push(result.path)
        }, 2000) // Wait for voice to finish
      } else if (result.type === 'query_result') {
        // Show results in console for now
        console.log('📊 Query results:', result.data)
      }

    } catch (error) {
      console.error('Voice command error:', error)
      speak('Sorry, something went wrong')
    } finally {
      setIsProcessing(false)
      setTimeout(() => setTranscript(''), 3000)
    }
  }

  const { isListening, isSupported, startListening } = useVoiceRecognition(handleTranscript)

  // Add keyboard shortcut
  useVoiceShortcut(startListening)

  if (!isSupported) {
    return (
      <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
        Voice not supported in this browser
      </div>
    )
  }

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={startListening}
          disabled={isListening || isProcessing}
          className={`
            w-16 h-16 rounded-full shadow-lg
            flex items-center justify-center
            transition-all duration-200
            ${isListening
              ? 'bg-red-500 animate-pulse'
              : isProcessing
              ? 'bg-yellow-500'
              : 'bg-blue-600 hover:bg-blue-700'
            }
            ${(isListening || isProcessing) ? 'cursor-not-allowed' : 'cursor-pointer'}
            text-white
          `}
          title={isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Click to speak (or press M)'}
        >
          {isListening ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd"/>
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
            </svg>
          )}
        </button>

        {/* Transcript display */}
        {(transcript || isListening) && (
          <div className="absolute bottom-20 left-0 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg max-w-xs">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {isListening ? 'Listening...' : transcript || 'Processing...'}
            </p>
          </div>
        )}

        {/* Mock mode indicator */}
        {USE_MOCK_MODE && (
          <div className="absolute top-0 left-20 bg-purple-500 text-white text-xs px-2 py-1 rounded">
            MOCK MODE
          </div>
        )}
      </div>

      {/* Results display (for testing) */}
      {lastResult && lastResult.type === 'query_result' && (
        <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-md z-50">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Query Results</h3>
            <button
              onClick={() => setLastResult(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>
          <pre className="text-xs overflow-auto max-h-64 bg-gray-100 dark:bg-gray-900 p-2 rounded text-gray-800 dark:text-gray-200">
            {JSON.stringify(lastResult.data, null, 2)}
          </pre>
        </div>
      )}
    </>
  )
}
