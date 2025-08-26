import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { createClient as createSupabaseBrowserClient } from '../../lib/supabase/client'

export default function OAuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const { code, next } = router.query
      
      if (code && typeof code === 'string') {
        try {
          const supabase = createSupabaseBrowserClient()
          const { error } = await (supabase as any).auth.exchangeCodeForSession(code)
          
          if (!error) {
            // Redirect to /app or the next parameter
            const redirectTo = next && typeof next === 'string' && next.startsWith('/') 
              ? next 
              : '/app/dashboard'
            
            router.replace(redirectTo)
            return
          }
        } catch (e) {
          console.error('Error exchanging code for session:', e)
        }
      }
      
      // If we get here, there was an error
      router.replace('/auth/auth-code-error')
    }

    if (router.isReady) {
      handleCallback()
    }
  }, [router])

  return (
    <div>
      <Head>
        <title>Conectando...</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center">
        <p>Procesando inicio de sesión...</p>
      </div>
    </div>
  )
}
