import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
const CloudBackground = dynamic(() => import('../components/CloudBackground'), { ssr: false })
import UserProfileSetup from '../components/UserProfileSetup'
import { useAuth } from '../lib/auth'

export default function Onboarding() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (!authLoading && !user) {
      router.push('/auth/start')
      return
    }

    // If user already has a profile, redirect to dashboard
    if (!authLoading && user && userProfile) {
      router.push('/app/dashboard')
      return
    }
  }, [user, userProfile, authLoading, router])

  const handleComplete = () => {
    router.push('/app/dashboard')
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  // If no user, redirect will happen in useEffect
  if (!user) {
    return null
  }

  return (
    <>
      <Head>
        <title>Configuración Inicial - Sistema HR</title>
        <meta name="description" content="Completa tu perfil para comenzar" />
      </Head>

      <div className="min-h-screen bg-app flex items-center justify-center p-4 relative">
        <CloudBackground />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxZTI5M2IiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <UserProfileSetup onComplete={handleComplete} />
      </div>
    </>
  )
}
