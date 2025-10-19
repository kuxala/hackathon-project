'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

interface VoiceModalProps {
  isOpen: boolean
  isListening: boolean
  isProcessing: boolean
  transcript: string
  onClose: () => void
}

export function VoiceModal({
  isOpen,
  isListening,
  isProcessing,
  transcript,
  onClose
}: VoiceModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const getStatusColor = () => {
    if (isListening) return { primary: '#6366f1', secondary: '#8b5cf6', tertiary: '#a855f7' }
    if (isProcessing) return { primary: '#f59e0b', secondary: '#f97316', tertiary: '#ef4444' }
    return { primary: '#10b981', secondary: '#14b8a6', tertiary: '#06b6d4' }
  }

  const colors = getStatusColor()

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh'
          }}
          onClick={onClose}
        >
          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              background: [
                `radial-gradient(circle at 20% 30%, ${colors.primary}15 0%, transparent 60%)`,
                `radial-gradient(circle at 80% 70%, ${colors.secondary}15 0%, transparent 60%)`,
                `radial-gradient(circle at 20% 30%, ${colors.primary}15 0%, transparent 60%)`,
              ],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex flex-col items-center justify-center w-full h-full max-w-4xl px-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main visual element - Pulsing circles */}
            <div className="relative w-80 h-80 flex items-center justify-center mb-12">
              {/* Outer ring */}
              <motion.div
                className="absolute w-80 h-80 rounded-full border"
                style={{
                  borderColor: `${colors.primary}20`,
                }}
                animate={{
                  scale: isListening ? [1, 1.15, 1] : [1, 1.05, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Middle ring */}
              <motion.div
                className="absolute w-56 h-56 rounded-full border"
                style={{
                  borderColor: `${colors.secondary}40`,
                }}
                animate={{
                  scale: isListening ? [1, 1.2, 1] : [1, 1.08, 1],
                  opacity: [0.4, 0.6, 0.4],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.2,
                }}
              />

              {/* Inner circle with gradient */}
              <motion.div
                className="absolute w-32 h-32 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${colors.primary}60, ${colors.secondary}40, transparent)`,
                  boxShadow: `0 0 60px ${colors.primary}40, 0 0 120px ${colors.secondary}20`,
                }}
                animate={{
                  scale: isListening ? [1, 1.25, 1] : [1, 1.1, 1],
                  opacity: [0.6, 0.9, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.4,
                }}
              />

              {/* Center dot */}
              <motion.div
                className="absolute w-4 h-4 rounded-full"
                style={{
                  backgroundColor: colors.primary,
                  boxShadow: `0 0 20px ${colors.primary}80`,
                }}
                animate={{
                  scale: isListening ? [1, 1.5, 1] : [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Orbiting particles */}
              {isListening && (
                <>
                  {[0, 60, 120, 180, 240, 300].map((angle) => (
                    <motion.div
                      key={angle}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: colors.tertiary,
                        filter: `blur(1px)`,
                      }}
                      animate={{
                        x: [
                          Math.cos((angle * Math.PI) / 180) * 100,
                          Math.cos(((angle + 360) * Math.PI) / 180) * 100,
                        ],
                        y: [
                          Math.sin((angle * Math.PI) / 180) * 100,
                          Math.sin(((angle + 360) * Math.PI) / 180) * 100,
                        ],
                        opacity: [0.3, 0.8, 0.3],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'linear',
                        delay: angle / 360,
                      }}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Status text */}
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <motion.h1
                className="text-6xl font-extralight tracking-wide mb-4"
                style={{
                  color: 'white',
                  textShadow: `0 0 40px ${colors.primary}80, 0 0 80px ${colors.secondary}60`,
                }}
                animate={{
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {isListening ? 'Listening' : isProcessing ? 'Processing' : 'Ready'}
              </motion.h1>

              <motion.p
                className="text-white/60 text-sm font-light tracking-widest uppercase"
                animate={{
                  opacity: [0.6, 0.9, 0.6],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {isListening ? 'Speak now' : isProcessing ? 'Analyzing your request' : 'Press M to activate'}
              </motion.p>
            </motion.div>

            {/* Transcript display */}
            <AnimatePresence mode="wait">
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-2xl mb-16"
                >
                  <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* Gradient border effect */}
                    <div
                      className="absolute inset-0 rounded-2xl opacity-50 blur-xl"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20, ${colors.tertiary}20)`,
                      }}
                    />

                    <p className="relative text-white/90 text-xl font-light text-center leading-relaxed">
                      &ldquo;{transcript}&rdquo;
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Suggestions */}
            {!transcript && !isListening && !isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-center space-y-3"
              >
                <p className="text-white/30 text-xs uppercase tracking-widest mb-4">Try asking</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {['What is my balance?', 'Show recent transactions', 'Open insights'].map((suggestion, i) => (
                    <motion.div
                      key={suggestion}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
                      className="px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
                    >
                      <span className="text-white/40 text-xs font-light">{suggestion}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Audio visualizer */}
            {isListening && (
              <motion.div
                initial={{ opacity: 0, scaleY: 0.5 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0.5 }}
                transition={{ duration: 0.3 }}
                className="flex gap-1 items-center h-20"
              >
                {Array.from({ length: 32 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full"
                    style={{
                      background: `linear-gradient(to top, ${colors.primary}, ${colors.secondary})`,
                    }}
                    animate={{
                      height: [
                        `${20 + Math.random() * 10}%`,
                        `${40 + Math.random() * 40}%`,
                        `${20 + Math.random() * 10}%`,
                      ],
                      opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{
                      duration: 0.6 + (i % 8) * 0.05,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.03,
                    }}
                  />
                ))}
              </motion.div>
            )}

            {/* Footer hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute bottom-12"
            >
              <p className="text-white/20 text-xs font-light">
                Press <span className="text-white/40 font-normal">ESC</span> to close
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
