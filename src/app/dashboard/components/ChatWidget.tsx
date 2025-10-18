'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import type { ChatMessage } from '@/lib/openrouter'

interface ChatWidgetProps {
  userId?: string
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Hello! I\'m your FinSight Assistant. How can I help you with your finances today?'
}

export function ChatWidget({ userId }: ChatWidgetProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const chatModalRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-2xl hover:from-green-600 hover:to-green-700 transition-all hover:scale-110 ring-4 ring-green-100 dark:ring-green-900"
        aria-label={isChatOpen ? 'Hide chat assistant' : 'Open chat assistant'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l.917-3.917A6.982 6.982 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
      </button>

      {isChatOpen && (
        <div
          ref={chatModalRef}
          className="fixed bottom-24 right-6 z-50 flex h-[500px] w-96 flex-col overflow-hidden rounded-lg border border-[rgb(40,40,40)] bg-[rgb(15,15,15)] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[rgb(40,40,40)] bg-gradient-to-r from-green-500/20 to-green-600/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l.917-3.917A6.982 6.982 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-50">FinSight Assistant</h3>
                <p className="text-xs text-green-300">Online</p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-gray-400 transition-colors hover:text-gray-200"
              aria-label="Close chat assistant"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message, index) => {
              const isAssistant = message.role === 'assistant'
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`flex max-w-[75%] items-start gap-3`}>
                    {isAssistant && (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l.917-3.917A6.982 6.982 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        isAssistant
                          ? 'border-[rgb(40,40,40)] bg-[rgb(20,20,20)] text-gray-200'
                          : 'border-green-500/50 bg-green-600/10 text-green-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
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

          <div className="border-t border-[rgb(40,40,40)] bg-[rgb(12,12,12)] p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-lg border border-[rgb(40,40,40)] bg-[rgb(15,15,15)] px-4 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSending}
              />
              <button
                type="submit"
                className="flex items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 px-4 py-2 text-white shadow-md transition-colors hover:from-green-600 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSending || !inputValue.trim()}
                aria-label="Send message"
              >
                {isSending ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
