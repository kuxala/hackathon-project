'use client'

import { useCallback, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { VoiceRecorder } from '../components/VoiceRecorder'
import { AudioPlayer } from '../components/AudioPlayer'
import type { ChatMessage } from '@/lib/openrouter'

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Hello! I\'m your FinSight Voice Assistant. You can ask me anything about your finances by speaking.'
}

export default function VoicePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE])
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentAudioResponse, setCurrentAudioResponse] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  // Check authentication
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/signin')
        return
      }
      setUser(session.user)
      setIsInitializing(false)
    }
    checkUser()
  }, [router])

  // Handle voice recording completion
  const handleVoiceRecordingComplete = useCallback(async (_audioBlob: Blob, transcript: string) => {
    console.log('Recording complete, transcript:', transcript)

    if (!transcript || isSending) {
      console.log('No transcript or already sending')
      return
    }

    const history = messages
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: transcript
    }

    setMessages(prev => [...prev, newUserMessage])
    setIsSending(true)
    setErrorMessage(null)
    setCurrentAudioResponse(null)

    try {
      console.log('Sending request to API...')

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      // Send transcript to voice API
      console.log('Sending payload:', { transcript, userId: user?.id })

      const response = await fetch('/api/voice/send-audio', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transcript,
          history,
          userId: user?.id,
          conversationId
        })
      })

      console.log('API response received, status:', response.status)

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const data: {
        success?: boolean
        responseText?: string
        audioData?: string
        conversationId?: string
      } = await response.json()

      if (!data.success || !data.responseText || !data.audioData) {
        console.log('Invalid API response:', data)
        throw new Error('Invalid response from voice service')
      }

      console.log('Response received successfully')

      // Update conversation ID
      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      // Add assistant message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.responseText
        }
      ])

      // Set audio for playback
      setCurrentAudioResponse(data.audioData)
    } catch (error) {
      console.error('Error:', error)
      setErrorMessage('Unable to process voice message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }, [messages, user?.id, conversationId, isSending])

  // Handle voice recording error
  const handleVoiceError = useCallback((error: string) => {
    setErrorMessage(error)
  }, [])

  // Handle audio playback complete
  const handleAudioPlaybackComplete = useCallback(() => {
    setCurrentAudioResponse(null)
  }, [])

  // Reset conversation
  const handleReset = useCallback(() => {
    setMessages([INITIAL_ASSISTANT_MESSAGE])
    setErrorMessage(null)
    setCurrentAudioResponse(null)
    setConversationId(null)
  }, [])

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(10,10,10)]">
        <div className="flex items-center gap-3 text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-[rgb(8,12,10)] via-[rgb(10,10,10)] to-[rgb(5,15,10)]">
      {/* Compact Header */}
      <header className="flex-shrink-0 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-gray-400 transition hover:text-emerald-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back
            </button>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-emerald-400">Voice Assistant</span>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Reset
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Centered Voice Recorder */}
      <main className="flex flex-1 items-center justify-center overflow-y-auto py-8">
        <div className="w-full max-w-2xl px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 via-black/50 to-green-950/50 p-12 shadow-2xl backdrop-blur-xl"
          >
            {/* Title */}
            <div className="mb-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-500/20 blur-2xl"></div>
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 shadow-2xl shadow-emerald-900/50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </div>
                </div>
              </div>
              <h1 className="mb-2 bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-500 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
                Voice Assistant
              </h1>
              <p className="text-gray-400">
                Hold the button and ask your financial question
              </p>
            </div>

            {/* Voice Recorder */}
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              onError={handleVoiceError}
              disabled={isSending}
            />

            {/* Audio Player */}
            {currentAudioResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <AudioPlayer
                  audioBase64={currentAudioResponse}
                  onPlaybackComplete={handleAudioPlaybackComplete}
                  autoPlay={true}
                />
              </motion.div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p>{errorMessage}</p>
                </div>
              </motion.div>
            )}

            {/* Last Response */}
            {messages.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm"
              >
                <div className="mb-2 flex items-center gap-2 text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                  <span className="text-xs font-semibold">Last Response:</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-300">
                  {messages[messages.length - 1].content}
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
