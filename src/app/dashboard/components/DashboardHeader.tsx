'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const NAV_LINKS = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'AI Insights', href: '/dashboard/insights' },
  { label: 'Predictions', href: '/dashboard/predictions' },
  { label: 'My Statements', href: '/statements' },
  { label: 'Budget', href: '#' },
  { label: 'Goals', href: '#' }
]

interface DashboardHeaderProps {
  user?: {
    email?: string
  }
  onSignOut?: () => void
}

export function DashboardHeader({ user, onSignOut }: DashboardHeaderProps) {
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isProfileOpen])

  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsProfileOpen(false)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <header className="sticky top-0 z-[90] border-b border-[rgb(30,30,30)] bg-[rgb(10,10,10)] px-4 py-3 sm:px-6 md:bg-[rgb(10,10,10)]/80 md:px-8 md:backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-4 rounded-lg px-1 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60"
          aria-label="Go to dashboard"
        >
          <div className="size-6 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-50">FinSight</h2>
        </button>
        <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-[rgb(30,30,30)] bg-[rgb(15,15,15)] text-gray-300 hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 md:hidden"
            aria-label="Open navigation menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4A1 1 0 013 5zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 4a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" />
            </svg>
          </button>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(link => (
            <a key={link.label} className="text-sm font-medium text-gray-300 hover:text-primary" href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(20,20,20)] text-gray-400 hover:bg-primary/20 hover:text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="size-10 rounded-full bg-[rgb(30,30,30)] flex items-center justify-center text-gray-300 hover:ring-2 hover:ring-primary/50 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[rgb(15,15,15)] rounded-lg shadow-2xl border border-[rgb(40,40,40)] py-2 z-50">
                {user?.email && (
                  <div className="px-4 py-3 border-b border-[rgb(40,40,40)]">
                    <p className="text-sm font-medium text-gray-100">Signed in as</p>
                    <p className="text-sm text-gray-400 truncate">{user.email}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false)
                    router.push('/settings')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[rgb(25,25,25)] flex items-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  Settings
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[rgb(25,25,25)] flex items-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Help & Support
                </button>
                {onSignOut && (
                  <>
                    <div className="border-t border-[rgb(40,40,40)] my-2"></div>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false)
                        onSignOut()
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[rgb(25,25,25)] flex items-center gap-3"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                      </svg>
                      Sign out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[80] flex md:hidden">
          <button
            type="button"
            className="h-full flex-1 bg-black/80"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex h-full w-[85%] max-w-xs flex-col gap-6 border-l border-[rgb(35,35,35)] bg-[rgb(12,12,12)] px-5 py-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-3 rounded-lg px-1 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60"
                aria-label="Go to dashboard"
              >
                <div className="size-6 text-primary">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z" fill="currentColor"></path>
                  </svg>
                </div>
                <span className="text-lg font-semibold text-gray-50">FinSight</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-[rgb(30,30,30)] bg-[rgb(15,15,15)] text-gray-300 hover:border-primary/40 hover:text-primary"
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-primary/10 hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex flex-col gap-4 border-t border-[rgb(30,30,30)] pt-4">
              <button className="flex items-center gap-3 rounded-lg border border-[rgb(35,35,35)] bg-[rgb(20,20,20)] px-3 py-2 text-sm font-medium text-gray-300 hover:border-primary/40 hover:text-primary">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-[rgb(25,25,25)]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                </span>
                Notifications
              </button>

              <div className="rounded-lg border border-[rgb(35,35,35)] bg-[rgb(18,18,18)] p-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex size-12 items-center justify-center rounded-full bg-[rgb(30,30,30)] text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-100">Account</span>
                    {user?.email && <span className="text-xs text-gray-400">{user.email}</span>}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      router.push('/settings')
                    }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-[rgb(25,25,25)]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Settings
                  </button>
                  <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-[rgb(25,25,25)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Help & Support
                  </button>
                  {onSignOut && (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        onSignOut()
                      }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-[rgb(25,25,25)]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                      </svg>
                      Sign out
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
