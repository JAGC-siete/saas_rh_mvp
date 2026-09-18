/** Título SEO ≤70: el nombre del negocio no se recorta. El subtítulo de plantilla cede. */

export const LANDING_SEO_TITLE_MAX = 70

export function brandedSeoTitle(
  businessName: string,
  templateTitle: string,
  max = LANDING_SEO_TITLE_MAX
): string {
  const name = businessName.trim()
  if (!name) return templateTitle.trim().slice(0, max)
  if (name.length >= max) return name.slice(0, max)

  const sep = ' | '
  const room = max - name.length - sep.length
  if (room < 4) return name

  const template = templateTitle.trim()
  if (template.length <= room) return `${name}${sep}${template}`

  const clipped = template
    .slice(0, room)
    .replace(/\s+\S*$/, '')
    .replace(/[|·,.:;-]+$/g, '')
    .trim()

  return clipped.length >= 4 ? `${name}${sep}${clipped}` : name
}
