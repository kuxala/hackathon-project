'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Header from '@/components/landing/Header'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import Footer from '@/components/landing/Footer'
import AnimatedBackground from '@/components/landing/AnimatedBackground'
import { LoadingState } from '@/components/shared/LoadingState'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <LoadingState
        fullscreen
        className="bg-background"
        label="Checking your session"
        description="Hang tight while we prepare your personalized experience."
      />
    )
  }

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <Header />
      <Hero />
      <Features />
      <Footer />
    </div>
  )
}
