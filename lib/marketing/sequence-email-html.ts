import { LIQUID, SITE_URL } from '../brand/liquid-tokens'
import {
  escapeHtml,
  escapeMultiline,
  liquidParagraph,
  wrapLiquidEmail,
} from '../emails/liquid-layout'
import { MARKETING_UNSUBSCRIBE_FOOTER_TEXT, buildUnsubscribeUrl } from './unsubscribe'
import {
  buildMissionPageUrl,
  buildMissionFooterHeader,
  getMissionDef,
  stripMissionTextFooter,
  stripTrailingSignOff,
  type MissionId,
} from './mission-config'
import { INFO_WELCOME_MISSION_TEASER } from './info-sequence-timing'
import { normalizeLeadSource } from './email-sequence-ledger'

const T = LIQUID

function missionChoiceButtons(missionId: MissionId, leadToken: string, source?: string | null): string {
  const mission = getMissionDef(missionId, source)
  const buttons = mission.choices
    .map((choice, idx) => {
      const href = buildMissionPageUrl(missionId, leadToken, choice.id)
      const isPrimary = missionId === 5 || idx === mission.choices.length - 1
      const bg = isPrimary
        ? `linear-gradient(135deg, ${T.brand500}, ${T.brand600})`
        : 'rgba(255,255,255,0.08)'
      const border = isPrimary ? 'transparent' : T.glassBorderLight
      return `
          <tr>
            <td style="padding: 0 0 10px 0;">
              <a href="${href}" style="display: block; text-align: center; padding: 14px 18px; border-radius: 12px; font-weight: 600; font-size: 14px; text-decoration: none; color: #ffffff; background: ${bg}; border: 1px solid ${border}; box-shadow: ${isPrimary ? '0 4px 14px rgba(59, 130, 246, 0.35)' : 'none'};">
                ${escapeHtml(choice.label)}
              </a>
            </td>
          </tr>`
    })
    .join('')

  return `
    <div style="margin: 28px 0 8px 0; padding: 20px 18px; border-radius: 16px; border: 1px solid rgba(251, 191, 36, 0.35); background: rgba(251, 191, 36, 0.06);">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #fcd34d;">
        ${escapeHtml(buildMissionFooterHeader(mission, source))}
      </p>
      <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: ${T.text}; line-height: 1.45;">
        ${escapeHtml(mission.question)}
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
        ${buttons}
      </table>
      <p style="margin: 14px 0 0 0; font-size: 12px; color: ${T.textMuted}; line-height: 1.5;">
        Un clic · Sin login · Respuesta instantánea en la web
      </p>
    </div>`
}

function missionTeaserHtml(): string {
  return `
    <div style="margin: 28px 0 0 0; padding: 18px 16px; border-radius: 14px; border: 1px dashed rgba(168, 85, 247, 0.45); background: rgba(168, 85, 247, 0.06);">
      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #c4b5fd;">
        🕹️ Próxima misión
      </p>
      <p style="margin: 0; font-size: 15px; color: ${T.text}; line-height: 1.55;">
        ${escapeHtml(INFO_WELCOME_MISSION_TEASER)}
      </p>
    </div>`
}

function bodyTextToHtml(bodyText: string, stripTeaser = false): string {
  let text = bodyText
  if (stripTeaser) {
    text = text.replace(new RegExp(`\\n\\n${INFO_WELCOME_MISSION_TEASER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '').trim()
  }
  const withoutMissionFooter = stripTrailingSignOff(stripMissionTextFooter(text))
  const blocks = withoutMissionFooter.split(/\n\n+/).filter(Boolean)
  return blocks
    .map((block) => {
      if (block.startsWith('Nota mental:')) {
        return liquidParagraph(`<em style="color: ${T.textAccent};">${escapeHtml(block)}</em>`)
      }
      return liquidParagraph(escapeMultiline(block))
    })
    .join('')
}

function signOffHtml(): string {
  return liquidParagraph('— <strong style="color: #fff;">Jorge</strong>')
}

function unsubscribeHtml(token: string): string {
  const url = escapeHtml(buildUnsubscribeUrl(token))
  return `
    <p style="margin: 24px 0 0 0; text-align: center; font-size: 12px; color: ${T.textMuted}; line-height: 1.55;">
      ${escapeHtml(MARKETING_UNSUBSCRIBE_FOOTER_TEXT)}<br />
      <a href="${url}" style="color: ${T.textAccent};">${url}</a>
    </p>`
}

export type BuildSequenceEmailHtmlInput = {
  subject: string
  bodyText: string
  unsubscribeToken: string
  missionId?: MissionId | null
  leadToken?: string
  badge?: string
  source?: string | null
}

export function buildSequenceEmailHtml(input: BuildSequenceEmailHtmlInput): string {
  const { subject, bodyText, unsubscribeToken, missionId, leadToken, badge, source } = input

  const missionBlock =
    missionId && leadToken ? missionChoiceButtons(missionId, leadToken, source) : ''

  const bodyHtml = [
    bodyTextToHtml(bodyText),
    missionBlock,
    signOffHtml(),
    unsubscribeHtml(unsubscribeToken),
  ].join('')

  return wrapLiquidEmail({
    title: subject,
    subtitle:
      normalizeLeadSource(source) === 'info'
        ? 'Claves para hacer las paces con RR.HH. · Humano SISU'
        : 'Tablero de notas de campo · Humano SISU',
    badge: badge ?? (missionId ? getMissionDef(missionId, source).badge : 'Serie educativa'),
    bodyHtml,
    footerNote: `Humano SISU · ${SITE_URL.replace(/^https?:\/\//, '')}`,
    extraCss: `
      .hero h1 { font-size: 20px; }
    `,
  })
}

export function buildWelcomeEmailHtml(input: {
  subject: string
  bodyText: string
  unsubscribeToken: string
  showMissionTeaser?: boolean
  source?: string | null
}): string {
  const bodyHtml = [
    bodyTextToHtml(input.bodyText, input.showMissionTeaser),
    input.showMissionTeaser ? missionTeaserHtml() : '',
    signOffHtml(),
    unsubscribeHtml(input.unsubscribeToken),
  ].join('')

  const welcomeKind = normalizeLeadSource(input.source)
  return wrapLiquidEmail({
    title: input.subject,
    subtitle:
      welcomeKind === 'suscripcion'
        ? 'Alertas sobre tu sueldo · Humano SISU'
        : welcomeKind === 'info'
          ? 'Claves para hacer las paces con RR.HH. · Humano SISU'
          : 'Notas de campo · Humano SISU',
    badge: welcomeKind === 'info' ? 'Clave #0' : 'Nota #0',
    bodyHtml,
  })
}
