'use client'

import { useEffect, useRef, useState } from 'react'

export function ChatWidget() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const chatModalRef = useRef<HTMLDivElement>(null)

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

  return (
    <>
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-2xl hover:from-green-600 hover:to-green-700 transition-all hover:scale-110 ring-4 ring-green-100 dark:ring-green-900"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l.917-3.917A6.982 6.982 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
      </button>

      {isChatOpen && (
        <div
          ref={chatModalRef}
          className="fixed bottom-24 right-6 z-50 w-96 h-[500px] rounded-lg shadow-2xl border border-[rgb(40,40,40)] bg-[rgb(15,15,15)] flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-[rgb(40,40,40)] bg-gradient-to-r from-green-500/20 to-green-600/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
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
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l.917-3.917A6.982 6.982 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="bg-[rgb(20,20,20)] border border-[rgb(40,40,40)] rounded-lg p-3 max-w-[75%]">
                  <p className="text-sm text-gray-200">
                    Hello! I&apos;m your FinSight Assistant. How can I help you with your finances today?
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-[rgb(40,40,40)] bg-[rgb(12,12,12)]">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-[rgb(40,40,40)] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 bg-[rgb(15,15,15)] text-gray-100 placeholder:text-gray-500"
              />
              <button className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
