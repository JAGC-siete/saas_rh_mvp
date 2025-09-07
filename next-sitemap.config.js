module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://humano-sisu.com',
  generateRobotsTxt: true,
  alternateRefs: [
    { href: process.env.NEXT_PUBLIC_SITE_URL || 'https://humano-sisu.com', hreflang: 'es' },
    { href: (process.env.NEXT_PUBLIC_SITE_URL || 'https://humano-sisu.com') + '/en', hreflang: 'en' },
  ],
}
