import { GetServerSideProps } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { useSession } from '@supabase/auth-helpers-react'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import AuthForm from '../components/AuthForm'

export default function HomePage() {
  const session = useSession()
  const router = useRouter()

  useEffect(() => {
    // Si hay sesión, redirigir al dashboard
    if (session?.user) {
      router.push('/dashboard')
    }
  }, [session, router])

  // Si no hay sesión, mostrar login
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema de RRHH</h1>
            <p className="text-gray-600">Acceso Administrativo</p>
          </div>
          <AuthForm />
        </div>
      </div>
    )
  }

  // Loading mientras redirige
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createPagesServerClient(ctx)
  const { data: { session } } = await supabase.auth.getSession()

  // Si hay sesión, redirigir al dashboard
  if (session) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    }
  }

  return {
    props: {}
  }
}
