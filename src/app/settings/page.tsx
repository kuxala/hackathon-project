'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '../dashboard/components/DashboardHeader'
import { LoadingState } from '@/components/shared/LoadingState'

interface NotificationToggles {
  productUpdates: boolean
  spendingAlerts: boolean
  weeklySummary: boolean
  securityAlerts: boolean
}

const notificationOptions: Array<{
  key: keyof NotificationToggles
  label: string
  description: string
}> = [
  {
    key: 'spendingAlerts',
    label: 'Spending alerts',
    description: 'Receive alerts when spending spikes above your projected budget.'
  },
  {
    key: 'weeklySummary',
    label: 'Weekly summaries',
    description: 'Get a tidy recap of balances, goals, and smart recommendations every Monday.'
  },
  {
    key: 'productUpdates',
    label: 'Product announcements',
    description: 'Hear about new automation features, accounts integrations, and releases.'
  },
  {
    key: 'securityAlerts',
    label: 'Security alerts',
    description: 'Immediate notifications for password updates or suspicious sign-ins.'
  }
]

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    company: '',
    phone: ''
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSavedAt, setProfileSavedAt] = useState<Date | null>(null)
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationToggles>({
    productUpdates: true,
    spendingAlerts: true,
    weeklySummary: false,
    securityAlerts: true
  })
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    const metadata = user.user_metadata || {}
    setProfileForm(current => ({
      ...current,
      fullName: metadata.full_name || '',
      company: metadata.company || '',
      phone: metadata.phone || ''
    }))
  }, [user])

  const userEmail = user?.email ?? 'Unknown user'
  const lastSavedMessage = useMemo(() => {
    if (!profileSavedAt) return ''
    return `Last saved ${profileSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }, [profileSavedAt])

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSavingProfile(true)

    setTimeout(() => {
      setIsSavingProfile(false)
      setProfileSavedAt(new Date())
    }, 800)
  }

  const handleNotificationToggle = (key: keyof NotificationToggles) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  if (loading) {
    return (
      <LoadingState
        fullscreen
        className="bg-[rgb(10,10,10)]"
        label="Loading your settings"
        description="We’re pulling in your account preferences."
      />
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen w-full flex-col bg-[rgb(10,10,10)]">
      <DashboardHeader user={user} onSignOut={signOut} />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-50">Account Settings</h1>
            <p className="mt-2 text-sm text-gray-400">
              Manage your FinSight profile, notification preferences, and security settings from a single place.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-[rgb(35,35,35)] bg-[rgb(15,15,15)] p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-100">Profile Information</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    This information appears in dashboards and reports shared with your team.
                  </p>
                </div>
                {lastSavedMessage && (
                  <span className="text-xs text-primary/70">{lastSavedMessage}</span>
                )}
              </div>
              <form className="mt-6 space-y-5" onSubmit={handleProfileSubmit}>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-300">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={profileForm.fullName}
                    onChange={event =>
                      setProfileForm(prev => ({ ...prev, fullName: event.target.value }))
                    }
                    className="mt-2 w-full rounded-lg border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] px-3 py-2 text-sm text-gray-100 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    placeholder="Add your full name"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300">
                    Company or team
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={profileForm.company}
                    onChange={event =>
                      setProfileForm(prev => ({ ...prev, company: event.target.value }))
                    }
                    className="mt-2 w-full rounded-lg border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] px-3 py-2 text-sm text-gray-100 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    placeholder="Who do you manage finances for?"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={event =>
                      setProfileForm(prev => ({ ...prev, phone: event.target.value }))
                    }
                    className="mt-2 w-full rounded-lg border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] px-3 py-2 text-sm text-gray-100 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    placeholder="Optional contact number"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    We use your number for critical financial alerts only. No marketing messages.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-400">
                    Your primary sign-in email is{' '}
                    <span className="text-gray-200 font-medium">{userEmail}</span>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin text-primary"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
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
                        Saving
                      </>
                    ) : (
                      'Save profile'
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-xl border border-[rgb(35,35,35)] bg-[rgb(15,15,15)] p-6">
              <h2 className="text-lg font-medium text-gray-100">Profile summary</h2>
              <p className="mt-2 text-sm text-gray-400">
                Your FinSight account is active and linked to Supabase authentication.
              </p>
              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex items-start justify-between">
                  <dt className="text-gray-400">Email</dt>
                  <dd className="text-gray-200">{userEmail}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="text-gray-400">Two-factor</dt>
                  <dd className={twoFactorEnabled ? 'text-emerald-400' : 'text-amber-400'}>
                    {twoFactorEnabled ? 'Enabled' : 'Not enabled'}
                  </dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="text-gray-400">Member since</dt>
                  <dd className="text-gray-200">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                  </dd>
                </div>
              </dl>
              <div className="mt-6 rounded-lg border border-[rgb(40,40,40)] bg-[rgb(20,20,20)] p-4">
                <h3 className="text-sm font-medium text-gray-100">Need to leave?</h3>
                <p className="mt-2 text-xs text-gray-500">
                  Contact support to fully delete your data or transfer ownership to another teammate.
                </p>
                {signOut && (
                  <button
                    onClick={signOut}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500/60"
                  >
                    Sign out
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-[rgb(35,35,35)] bg-[rgb(15,15,15)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-100">Notifications</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Choose how FinSight keeps you informed about your finances.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Email delivery
                </span>
              </div>

              <ul className="mt-6 space-y-4">
                {notificationOptions.map(item => (
                  <li
                    key={item.key}
                    className="flex items-center justify-between rounded-lg border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] px-4 py-3"
                  >
                    <div className="mr-4">
                      <p className="text-sm font-medium text-gray-100">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotificationToggle(item.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 ${
                        notificationPrefs[item.key] ? 'bg-primary/80' : 'bg-[rgb(45,45,45)]'
                      }`}
                    >
                      <span className="sr-only">Toggle {item.label}</span>
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          notificationPrefs[item.key] ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-[rgb(35,35,35)] bg-[rgb(15,15,15)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-100">Security</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Additional protection keeps your workspace and financial data safe.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-xs font-medium text-emerald-400">
                  Recommended
                </span>
              </div>

              <div className="mt-6 space-y-5">
                <div className="rounded-lg border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-100">Two-factor authentication</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Require a verification code at sign in. Recommended for all financial collaborators.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTwoFactorEnabled(prev => !prev)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 ${
                        twoFactorEnabled ? 'bg-emerald-500/80' : 'bg-[rgb(45,45,45)]'
                      }`}
                    >
                      <span className="sr-only">Toggle two-factor authentication</span>
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          twoFactorEnabled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    When you enable 2FA, FinSight generates backup codes and accepts authenticator apps.
                  </div>
                </div>

                <div className="rounded-lg border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-100">Connected apps</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Review integrations that can read or write your financial data.
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Coming Soon
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-md border border-[rgb(45,45,45)] bg-[rgb(22,22,22)] px-3 py-2 text-xs text-gray-400">
                      <span>QuickBooks Online</span>
                      <span>Pending</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-[rgb(45,45,45)] bg-[rgb(22,22,22)] px-3 py-2 text-xs text-gray-400">
                      <span>Plaid Insights</span>
                      <span>Active</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-[rgb(50,50,50)] bg-[rgb(20,20,20)] p-4">
                  <h3 className="text-sm font-medium text-gray-100">Session management</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Sign out other devices or revoke access from lost hardware.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/40 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60"
                  >
                    View active sessions
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
