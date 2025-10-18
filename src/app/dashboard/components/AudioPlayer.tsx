'use client'

import { useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
  audioBase64: string
  onPlaybackComplete?: () => void
  autoPlay?: boolean
}

export function AudioPlayer({ audioBase64, onPlaybackComplete, autoPlay = true }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audioBase64) {
      return
    }

    let isCleanedUp = false

    // Convert base64 to blob URL
    const byteCharacters = atob(audioBase64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)

    // Create and setup audio element
    const audio = new Audio(url)
    audioRef.current = audio

    audio.onplay = () => {
      if (!isCleanedUp) setIsPlaying(true)
    }
    audio.onpause = () => {
      if (!isCleanedUp) setIsPlaying(false)
    }
    audio.onended = () => {
      if (!isCleanedUp) {
        setIsPlaying(false)
        setProgress(100)
        onPlaybackComplete?.()
      }
    }

    audio.ontimeupdate = () => {
      if (!isCleanedUp && audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
      }
    }

    // Auto-play if enabled
    if (autoPlay) {
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          if (!isCleanedUp) {
            console.error('Failed to auto-play audio:', error)
          }
        })
      }
    }

    // Cleanup
    return () => {
      isCleanedUp = true
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      URL.revokeObjectURL(url)
    }
  }, [audioBase64, autoPlay, onPlaybackComplete])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-[#16251d] via-[#15231c] to-[#101a15] px-4 py-3 shadow-lg shadow-emerald-900/20">
      {/* AI Avatar */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 shadow-md shadow-emerald-900/30">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l.917-3.917A6.982 6.982 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
      </div>

      {/* Waveform Visualization */}
      <div className="flex-1 flex items-center gap-1 h-8">
        {isPlaying ? (
          // Animated bars when playing
          Array?.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-green-500 rounded-full transition-all"
              style={{
                height: `${Math.random() * 60 + 40}%`,
                animation: `pulse ${Math.random() * 0.5 + 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.05}s`
              }}
            />
          ))
        ) : (
          // Progress bar when not playing
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Speaking indicator */}
      <div className="flex items-center gap-2">
        {isPlaying ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <span className="text-xs text-green-400 font-medium">Speaking...</span>
          </>
        ) : progress === 100 ? (
          <span className="text-xs text-gray-500">Finished</span>
        ) : (
          <span className="text-xs text-gray-500">Ready</span>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scaleY(0.3);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  )
}
