export function mercadoPublicOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_MERCADO_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://humanosisu.net'
  const origin = raw.replace(/\/$/, '')
  if (/localhost|127\.0\.0\.1/i.test(origin)) return 'https://humanosisu.net'
  return origin
}

export function mercadoAbsoluteUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${mercadoPublicOrigin()}${path.startsWith('/') ? path : `/${path}`}`
}
