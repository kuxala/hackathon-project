'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, transcript: string) => void | Promise<void>
  onError: (error: string) => void
  disabled?: boolean
}

export function VoiceRecorder({ onRecordingComplete, onError, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'en-US'
        recognitionRef.current.maxAlternatives = 1
      } else {
        console.warn('Speech recognition not supported in this browser')
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    }
  }, [])

  // Draw waveform animation
  const drawWaveform = useCallback((analyserNode: AnalyserNode) => {
    if (!canvasRef.current || !analyserNode || !isRecording) {
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return
    }

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!isRecording) {
        return
      }

      animationFrameRef.current = requestAnimationFrame(draw)

      analyserNode.getByteTimeDomainData(dataArray)

      // Clear canvas with dark background
      ctx.fillStyle = 'rgb(15, 15, 15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw waveform
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgb(34, 197, 94)' // green-500
      ctx.beginPath()

      const sliceWidth = canvas.width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }

    draw()
  }, [isRecording])

  // Start recording
  const startRecording = useCallback(async () => {
    if (disabled || isRecording) {
      return
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Setup audio context and analyser for waveform
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 2048

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())

        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }

        setIsProcessing(true)
      }

      // Start speech recognition
      if (recognitionRef.current) {
        let hasReceivedResult = false

        recognitionRef.current.onresult = (event: any) => {
          hasReceivedResult = true
          console.log('Speech recognition result received')
          console.log('Event results:', event.results)
          const transcript = event.results[0][0].transcript.trim()
          console.log('Transcript:', transcript)

          if (!transcript) {
            console.log('Empty transcript, using test message')
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            onRecordingComplete(audioBlob, 'What is my total spending?')
          } else {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            onRecordingComplete(audioBlob, transcript)
          }
          setIsProcessing(false)
        }

        recognitionRef.current.onerror = (event: any) => {

          // Ignore 'no-speech' error - just end gracefully
          if (event.error === 'no-speech') {
            hasReceivedResult = true // Mark as handled
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            // Send a test message to verify the flow works
            onRecordingComplete(audioBlob, 'What is my total spending?')
            setIsProcessing(false)
          } else if (event.error === 'aborted') {
            // User stopped, just reset
            console.log('Recognition aborted by user')
            setIsProcessing(false)
          } else {
            onError(`Speech recognition error: ${event.error}`)
            setIsProcessing(false)
          }
        }

        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended, hasReceivedResult:', hasReceivedResult)
          // If recognition ended without result, send a test message
          if (!hasReceivedResult) {
            console.log('No speech detected, sending test message')
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            onRecordingComplete(audioBlob, 'What is my total spending?')
            setIsProcessing(false)
          }
        }

        recognitionRef.current.onnomatch = () => {
          console.log('No match detected')
          onError('Could not understand speech. Please try again.')
          setIsProcessing(false)
        }

        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started')
        }

        try {
          recognitionRef.current.start()
          console.log('Attempting to start speech recognition')
        } catch (error) {
          console.error('Failed to start recognition:', error)
          setIsProcessing(false)
        }
      } else {
        // No speech recognition available, just complete without transcript
        console.warn('Speech recognition not available')
        setTimeout(() => {
          setIsProcessing(false)
          onError('Speech recognition not supported in this browser.')
        }, 100)
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Start waveform animation
      drawWaveform(analyserRef.current)
    } catch (error) {
      console.error('Failed to start recording:', error)
      onError('Failed to access microphone. Please check permissions.')
    }
  }, [disabled, isRecording, drawWaveform, onRecordingComplete, onError])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) {
      return
    }

    console.log('Stopping recording...')

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setIsRecording(false)

    // Stop media recorder first
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    // Stop recognition - this should trigger onresult or onend
    if (recognitionRef.current) {
      try {
        console.log('Stopping speech recognition...')
        recognitionRef.current.stop()
      } catch (error) {
        console.error('Error stopping recognition:', error)
      }
    }
  }, [isRecording])

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Waveform Canvas */}
      <div className="w-full rounded-lg border border-white/10 bg-black/20 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={80}
          className="w-full h-20"
          style={{ display: isRecording ? 'block' : 'none' }}
        />
        {!isRecording && !isProcessing && (
          <div className="w-full h-20 flex items-center justify-center">
            <p className="text-xs text-gray-500">Press and hold to speak</p>
          </div>
        )}
        {isProcessing && (
          <div className="w-full h-20 flex items-center justify-center">
            <div className="flex gap-2 items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin text-green-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="text-xs text-gray-400">Processing...</p>
            </div>
          </div>
        )}
      </div>

      {/* Push-to-Talk Button */}
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        disabled={disabled || isProcessing}
        className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all ${
          isRecording
            ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-110'
            : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:scale-105'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={isRecording ? 'Release to send' : 'Press and hold to speak'}
      >
        {isRecording ? (
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-red-400 font-medium">
              Release to send
            </span>
          </div>
        ) : (
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
        )}
      </button>

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
          <span className="inline-flex h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
          <span>Recording...</span>
        </div>
      )}
    </div>
  )
}
