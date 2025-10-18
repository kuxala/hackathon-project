'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
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
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg font-light tracking-tight">Hackathon</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground/60">{user.email}</span>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm text-foreground/80 hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h2 className="text-3xl font-light tracking-tight">Dashboard</h2>
            <p className="text-sm text-foreground/60">Welcome back to your workspace</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-sm text-foreground/60">Projects</p>
              <p className="text-3xl font-light">0</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-sm text-foreground/60">Tasks</p>
              <p className="text-3xl font-light">0</p>
            </div>
            <div className="border border-border rounded-lg p-6 space-y-2">
              <p className="text-sm text-foreground/60">Completed</p>
              <p className="text-3xl font-light">0</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h3 className="text-xl font-light tracking-tight">Recent Activity</h3>
            <div className="border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-foreground/60">No activity yet</p>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-light tracking-tight">Account</h3>
            <div className="border border-border rounded-lg divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-foreground/60">Email</span>
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-foreground/60">User ID</span>
                <span className="text-sm font-mono text-xs">{user.id}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-foreground/60">Account Created</span>
                <span className="text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
