import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import PublicPageShell from '../components/landing/PublicPageShell'
import UserProfileSetup from '../components/UserProfileSetup'
import { useAuth } from '../lib/auth'

export default function Onboarding() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/start')
      return
    }

    if (!authLoading && user && userProfile) {
      router.push('/app/dashboard')
      return
    }
  }, [user, userProfile, authLoading, router])

  const handleComplete = () => {
    router.push('/app/dashboard')
  }

  if (authLoading) {
    return (
      <PublicPageShell centered showFooter={false}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </PublicPageShell>
    )
  }

  if (!user) {
    return null
  }

  return (
    <PublicPageShell centered showFooter={false}>
      <Head>
        <title>Configuración Inicial - Sistema HR</title>
        <meta name="description" content="Completa tu perfil para comenzar" />
      </Head>
      <div className="p-4 w-full max-w-lg">
        <UserProfileSetup onComplete={handleComplete} />
      </div>
    </PublicPageShell>
  )
}
