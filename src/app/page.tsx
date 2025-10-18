'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-foreground/60">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg font-light tracking-tight">Hackathon</h1>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 text-sm text-foreground/80 hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-light tracking-tight">Welcome back</h2>
            <p className="text-sm text-foreground/60">You&apos;re signed in</p>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-foreground/60">Email</span>
              <span className="text-sm">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-foreground/60">User ID</span>
              <span className="text-sm font-mono text-xs">{user.id}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
