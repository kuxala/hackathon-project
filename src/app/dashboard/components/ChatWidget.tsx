'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

import type { ChatMessage } from '@/lib/openrouter'

interface ChatWidgetProps {
  userId?: string
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Hello! I\'m your FinSight Assistant. How can I help you with your finances today?'
}

const PROMPT_SUGGESTIONS = [
  'Help me build a monthly budget with my current income.',
  'Review my recent spending and highlight trends.',
  'Suggest ways to increase my savings over the next quarter.'
]

export function ChatWidget({ userId }: ChatWidgetProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const chatModalRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (chatModalRef.current && !chatModalRef.current.contains(event.target as Node)) {
        setIsChatOpen(false)
      }
    }

    if (isChatOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isChatOpen])

  useEffect(() => {
    if (!isChatOpen) {
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isChatOpen])

  const handleSendMessage = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedMessage = inputValue.trim()
    if (!trimmedMessage || isSending) {
      return
    }

    const history = messages
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: trimmedMessage
    }

    setMessages(prev => [...prev, newUserMessage])
    setInputValue('')
    setIsSending(true)
    setErrorMessage(null)

    try {
      // Get auth token from Supabase
      const { data: { session } } = await supabase.auth.getSession()

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // Add authorization header if session exists
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: trimmedMessage,
          history,
          userId
        })
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const data: { success?: boolean; message?: string } = await response.json()

      if (!data.success || !data.message) {
        throw new Error('Invalid response from chat service')
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.message
        }
      ])
    } catch (error) {
      console.error('Chat widget error:', error)
      setErrorMessage('Unable to reach FinSight Assistant. Please try again.')
    } finally {
      setIsSending(false)
    }
  }, [inputValue, isSending, messages, userId])

  const resetConversation = useCallback(() => {
    setMessages([INITIAL_ASSISTANT_MESSAGE])
    setErrorMessage(null)
    setInputValue('')
  }, [])

  const handleSuggestionClick = useCallback((prompt: string) => {
    if (isSending) {
      return
    }
    setInputValue(prompt)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [isSending])

  const hasConversationStarted = messages.some(message => message.role === 'user')

  return (
    <>
      <button
        onClick={() => {
          setIsChatOpen(prev => !prev)
          if (!isChatOpen) {
            // Clear any leftover errors when reopening the assistant
            setErrorMessage(null)
          }
        }}
        className="fixed bottom-4 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-2xl hover:from-green-600 hover:to-green-700 transition-all hover:scale-110 ring-4 ring-green-100 dark:ring-green-900 sm:bottom-6 sm:right-6"
        aria-label={isChatOpen ? 'Hide chat assistant' : 'Open chat assistant'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l.917-3.917A6.982 6.982 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
      </button>

      {isChatOpen && (
        <div
          ref={chatModalRef}
          className="fixed inset-x-4 bottom-20 z-50 flex h-[70vh] max-h-[calc(100vh-6rem)] w-auto flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f1412] via-[#0c1711] to-[#101d15] shadow-[0_25px_70px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[520px] sm:w-[26rem]"
        >
          <div className="relative bg-black/30 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-500/40">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l.917-3.917A6.982 6.982 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-white">FinSight Assistant</h3>
                  <div className="flex items-center gap-2 text-xs text-emerald-200/90">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    <span>Online • 24/7 financial guidance</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-400 transition-colors hover:border-white/20 hover:text-gray-100"
                aria-label="Close chat assistant"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="mt-3 text-xs text-emerald-200/70">
              Ask anything about budgeting, spending, or investments. I will tailor answers to your FinSight data.
            </p>
          </div>

          <div
            className="relative flex-1 space-y-4 overflow-y-auto bg-black/20 px-4 py-4 text-sm text-gray-100 backdrop-blur-sm sm:px-5 sm:py-5"
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {!hasConversationStarted && (
              <div className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-emerald-100 shadow-lg shadow-emerald-900/25">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/70">Quick suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_SUGGESTIONS.map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSuggestionClick(prompt)}
                      className="group rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-left text-xs font-medium text-emerald-100 transition hover:border-emerald-400/60 hover:bg-emerald-500/20 hover:text-white"
                    >
                      {prompt}
                      <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-emerald-300/70 opacity-0 transition-opacity group-hover:opacity-100">
                        Try
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => {
              const isAssistant = message.role === 'assistant'
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  <div className="flex max-w-[85%] items-start gap-3 sm:max-w-[75%]">
                    {isAssistant && (
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 shadow-md shadow-emerald-900/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l.917-3.917A6.982 6.982 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl border px-4 py-3 leading-relaxed shadow-lg transition ${
                        isAssistant
                          ? 'border-white/10 bg-gradient-to-br from-[#16251d] via-[#15231c] to-[#101a15] text-emerald-50 shadow-emerald-900/20'
                          : 'border-emerald-500/40 bg-gradient-to-br from-[#1f4f37] via-[#215d3f] to-[#1c7245] text-white shadow-emerald-900/30'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-[13px]">{message.content}</p>
                    </div>
                  </div>
                </div>
              )
            })}

            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-[rgb(40,40,40)] bg-[rgb(20,20,20)] px-3 py-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-green-400/80"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-green-400/80" style={{ animationDelay: '0.1s' }}></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-green-400/80" style={{ animationDelay: '0.2s' }}></span>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                <p>{errorMessage}</p>
                <button
                  onClick={resetConversation}
                  className="mt-2 text-xs font-medium text-red-200 underline underline-offset-4"
                >
                  Reset conversation
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-4">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2 sm:gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-xl border border-transparent bg-white/5 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 transition focus:border-emerald-500/50 focus:bg-black/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSending}
              />
              <button
                type="submit"
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-600 hover:via-green-500 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSending || !inputValue.trim()}
                aria-label="Send message"
              >
                {isSending ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  <>
                    <span className="text-xs uppercase tracking-[0.24em] text-emerald-200/90 transition group-hover:text-white">Send</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
