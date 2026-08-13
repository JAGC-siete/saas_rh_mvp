export type SocialNetwork = 'x' | 'facebook' | 'linkedin'

export type SocialSharePlacement = 'bridge' | 'post-calc'

export function buildSocialShareUrl(network: SocialNetwork, url: string, text: string): string {
  switch (network) {
    case 'x':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  }
}
