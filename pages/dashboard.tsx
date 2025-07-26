import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function DashboardPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to main dashboard at root
    router.replace('/')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
