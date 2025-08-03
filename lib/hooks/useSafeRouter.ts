import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

export function useSafeRouter() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return {
    ...router,
    isReady: mounted && router.isReady,
    push: mounted ? router.push : () => {},
    replace: mounted ? router.replace : () => {},
    back: mounted ? router.back : () => {},
    forward: mounted ? router.forward : () => {},
    reload: mounted ? router.reload : () => {},
    prefetch: mounted ? router.prefetch : () => Promise.resolve(),
    beforePopState: mounted ? router.beforePopState : () => true,
    events: mounted ? router.events : { on: () => {}, off: () => {}, emit: () => {} },
    query: mounted ? router.query : {},
    pathname: mounted ? router.pathname : '',
    asPath: mounted ? router.asPath : '',
    basePath: mounted ? router.basePath : '',
    locale: mounted ? router.locale : '',
    locales: mounted ? router.locales : [],
    defaultLocale: mounted ? router.defaultLocale : '',
    domainLocales: mounted ? router.domainLocales : [],
    isLocaleDomain: mounted ? router.isLocaleDomain : false,
    isFallback: mounted ? router.isFallback : false,
    isPreview: mounted ? router.isPreview : false,
  }
} 