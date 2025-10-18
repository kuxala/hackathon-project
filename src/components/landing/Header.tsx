'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function Header() {
  const { user } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-foreground flex items-center gap-3">
          <div className="size-6 text-foreground">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z" fill="currentColor"></path>
            </svg>
          </div>
          FinSight
        </Link>

        <nav>
          {user ? (
            <Link
              href="/dashboard"
              className="px-6 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-6 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
