/**
 * Transactional email layout — delegates to liquid-layout (Infraestructura Líquida).
 * API preserved for backward compatibility with existing email modules.
 */

import {
  escapeHtml,
  liquidBulletList,
  liquidCodeBlock,
  liquidCta,
  liquidEmphasis,
  liquidInfoBox,
  liquidKeyValueTable,
  liquidParagraph,
  wrapLiquidEmail,
  type WrapLiquidEmailOptions,
} from './liquid-layout'

export { escapeHtml, liquidEmphasis as transactionalEmphasis, liquidCodeBlock }

export const transactionalParagraph = liquidParagraph
export const transactionalKeyValueTable = liquidKeyValueTable
export const transactionalBulletList = liquidBulletList
export const transactionalCta = liquidCta
export const transactionalInfoBox = liquidInfoBox

export interface TransactionalEmailOptions {
  title: string
  subtitle?: string
  bodyHtml: string
  footerNote?: string
  badge?: string
}

export function wrapTransactionalEmail(options: TransactionalEmailOptions): string {
  const wrapOptions: WrapLiquidEmailOptions = {
    title: options.title,
    subtitle: options.subtitle,
    bodyHtml: options.bodyHtml,
    footerNote: options.footerNote,
    badge: options.badge,
  }
  return wrapLiquidEmail(wrapOptions)
}
