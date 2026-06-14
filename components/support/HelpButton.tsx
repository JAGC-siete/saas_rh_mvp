import { useRouter } from 'next/router'
import { useCallback } from 'react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

/**
 * Floating help button (Factorial/Odoo pattern). Captures the current module
 * from the route and forwards it to the new-ticket form for contextual reports.
 */
export default function HelpButton() {
  const router = useRouter()

  const handleClick = useCallback(() => {
    // Don't loop onto itself when already on the support page.
    if (router.pathname.startsWith('/app/support')) return

    // Derive an affected-module label from the dashboard route.
    const segment = router.pathname.replace(/^\/app\/?/, '').split('/')[0] || 'dashboard'

    router.push({
      pathname: '/app/support',
      query: {
        view: 'new',
        module: segment,
        from: router.asPath,
      },
    })
  }, [router])

  // Hide on the support page itself.
  if (router.pathname.startsWith('/app/support')) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Reportar un problema"
      title="Reportar un problema"
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-black/30 transition-all duration-200 hover:bg-brand-700 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
    >
      <QuestionMarkCircleIcon className="h-6 w-6" />
    </button>
  )
}
