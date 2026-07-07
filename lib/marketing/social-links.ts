/** Official Humano SISU social profiles — single source of truth. */
export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com/humanosisu',
  instagram: 'https://instagram.com/humanosisu',
  linkedin: 'https://www.linkedin.com/in/g%C3%B3mez-jorge-arturo/',
  youtube: 'https://www.youtube.com/@giorgio_armani_the_first',
  tiktok: 'https://www.tiktok.com/@humanosisu',
  x: 'https://x.com/humanosisu',
} as const

export const SOCIAL_SAME_AS = [
  SOCIAL_LINKS.facebook,
  SOCIAL_LINKS.instagram,
  SOCIAL_LINKS.linkedin,
  SOCIAL_LINKS.youtube,
  SOCIAL_LINKS.tiktok,
  SOCIAL_LINKS.x,
]

export const PAZ_SOCIAL_LINKS = [
  { label: 'Instagram', href: SOCIAL_LINKS.instagram },
  { label: 'LinkedIn', href: SOCIAL_LINKS.linkedin },
  { label: 'YouTube', href: SOCIAL_LINKS.youtube },
  { label: 'TikTok', href: SOCIAL_LINKS.tiktok },
  { label: 'X', href: SOCIAL_LINKS.x },
] as const
