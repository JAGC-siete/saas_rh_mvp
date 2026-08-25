import {
  OdooTransportError,
  isRetryableStatus,
  type OdooNamedArgs,
  type OdooTransport,
} from './types'
import { odooFetch } from './http'

type XmlRpcOptions = {
  baseUrl: string
  apiKey: string
  databaseName: string
  login: string
  fetchImpl?: typeof fetch
  uid?: number
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function encodeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '<value><nil/></value>'
  }
  if (typeof value === 'boolean') {
    return `<value><boolean>${value ? 1 : 0}</boolean></value>`
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return `<value><int>${value}</int></value>`
    }
    return `<value><double>${value}</double></value>`
  }
  if (typeof value === 'string') {
    return `<value><string>${xmlEscape(value)}</string></value>`
  }
  if (Array.isArray(value)) {
    const members = value.map((item) => encodeValue(item)).join('')
    return `<value><array><data>${members}</data></array></value>`
  }
  if (typeof value === 'object') {
    const members = Object.entries(value as Record<string, unknown>)
      .map(
        ([k, v]) =>
          `<member><name>${xmlEscape(k)}</name>${encodeValue(v)}</member>`
      )
      .join('')
    return `<value><struct>${members}</struct></value>`
  }
  return `<value><string>${xmlEscape(String(value))}</string></value>`
}

function encodeMethodCall(method: string, params: unknown[]): string {
  const encoded = params.map((p) => `<param>${encodeValue(p)}</param>`).join('')
  return `<?xml version="1.0"?><methodCall><methodName>${xmlEscape(
    method
  )}</methodName><params>${encoded}</params></methodCall>`
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

function indexOfTag(xml: string, tag: string, from: number): number {
  const open = xml.indexOf(`<${tag}`, from)
  return open
}

function skipTagOpen(xml: string, from: number): number {
  const gt = xml.indexOf('>', from)
  return gt === -1 ? xml.length : gt + 1
}

/** First matching close of `<tag>` starting at `start` (index of '<'). Nested-safe. */
function findMatchingClose(xml: string, start: number, tag: string): number {
  const close = `</${tag}>`
  let depth = 0
  let i = start
  while (i < xml.length) {
    const nextOpen = indexOfTag(xml, tag, i)
    const nextClose = xml.indexOf(close, i)
    if (nextClose === -1) return -1
    if (nextOpen !== -1 && nextOpen < nextClose) {
      const after = skipTagOpen(xml, nextOpen)
      if (xml.slice(nextOpen, after).endsWith('/>')) {
        i = after
        continue
      }
      depth += 1
      i = after
      continue
    }
    depth -= 1
    if (depth === 0) return nextClose
    i = nextClose + close.length
  }
  return -1
}

function extractInner(xml: string, start: number, tag: string): { inner: string; end: number } | null {
  const openEnd = skipTagOpen(xml, start)
  if (xml.slice(start, openEnd).endsWith('/>')) {
    return { inner: '', end: openEnd }
  }
  const closeAt = findMatchingClose(xml, start, tag)
  if (closeAt === -1) return null
  return { inner: xml.slice(openEnd, closeAt), end: closeAt + tag.length + 3 }
}

function splitTopLevel(xml: string, tag: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < xml.length) {
    const start = indexOfTag(xml, tag, i)
    if (start === -1) break
    const extracted = extractInner(xml, start, tag)
    if (!extracted) break
    out.push(extracted.inner)
    i = extracted.end
  }
  return out
}

function decodeXmlValue(xml: string): unknown {
  const trimmed = xml.trim()
  if (!trimmed) return ''

  const intMatch = trimmed.match(/^<int>(-?\d+)<\/int>$/)
  if (intMatch) return Number(intMatch[1])
  const i4Match = trimmed.match(/^<i4>(-?\d+)<\/i4>$/)
  if (i4Match) return Number(i4Match[1])
  const boolMatch = trimmed.match(/^<boolean>([01])<\/boolean>$/)
  if (boolMatch) return boolMatch[1] === '1'
  const doubleMatch = trimmed.match(/^<double>([^<]+)<\/double>$/)
  if (doubleMatch) return Number(doubleMatch[1])
  if (trimmed.startsWith('<string')) {
    const extracted = extractInner(trimmed, 0, 'string')
    return decodeXmlEntities(extracted?.inner ?? '')
  }
  if (trimmed === '<nil/>' || trimmed === '<nil></nil>' || trimmed.startsWith('<nil')) {
    return null
  }
  if (trimmed.startsWith('<array')) {
    const arrayInner = extractInner(trimmed, 0, 'array')
    const dataXml = arrayInner?.inner ?? trimmed
    const dataStart = indexOfTag(dataXml, 'data', 0)
    const dataInner =
      dataStart === -1 ? dataXml : extractInner(dataXml, dataStart, 'data')?.inner ?? ''
    return splitTopLevel(dataInner, 'value').map((inner) => decodeXmlValue(inner))
  }
  if (trimmed.startsWith('<struct')) {
    const structInner = extractInner(trimmed, 0, 'struct')?.inner ?? ''
    const obj: Record<string, unknown> = {}
    for (const memberInner of splitTopLevel(structInner, 'member')) {
      const nameStart = indexOfTag(memberInner, 'name', 0)
      const valueStart = indexOfTag(memberInner, 'value', 0)
      if (nameStart === -1 || valueStart === -1) continue
      const name = decodeXmlEntities(extractInner(memberInner, nameStart, 'name')?.inner ?? '')
      const valueInner = extractInner(memberInner, valueStart, 'value')?.inner ?? ''
      obj[name] = decodeXmlValue(valueInner)
    }
    return obj
  }
  if (trimmed.startsWith('<value')) {
    const inner = extractInner(trimmed, 0, 'value')
    return decodeXmlValue(inner?.inner ?? '')
  }
  return decodeXmlEntities(trimmed)
}

export function parseXmlRpcMethodResponse(xml: string): unknown {
  const faultStart = xml.indexOf('<fault>')
  if (faultStart !== -1) {
    const valueStart = indexOfTag(xml, 'value', faultStart)
    const inner = valueStart === -1 ? '' : extractInner(xml, valueStart, 'value')?.inner ?? ''
    const decoded = decodeXmlValue(inner)
    const msg =
      typeof decoded === 'object' && decoded && 'faultString' in decoded
        ? String((decoded as { faultString: unknown }).faultString)
        : 'XML-RPC fault'
    throw new OdooTransportError(msg, 400, false)
  }
  const paramsStart = xml.indexOf('<params>')
  if (paramsStart === -1) {
    throw new OdooTransportError('Invalid XML-RPC response', 502, true)
  }
  const valueStart = indexOfTag(xml, 'value', paramsStart)
  if (valueStart === -1) {
    throw new OdooTransportError('Invalid XML-RPC response', 502, true)
  }
  const inner = extractInner(xml, valueStart, 'value')?.inner ?? ''
  return decodeXmlValue(inner)
}

async function xmlRpcCall(
  fetchImpl: typeof fetch,
  url: string,
  method: string,
  params: unknown[]
): Promise<unknown> {
  let res: Response
  try {
    res = await odooFetch(fetchImpl, url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'User-Agent': 'humano-sisu-odoo-bridge',
      },
      body: encodeMethodCall(method, params),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network error'
    throw new OdooTransportError(msg, 0, true)
  }

  const text = await res.text()
  if (!res.ok) {
    throw new OdooTransportError(text || `HTTP ${res.status}`, res.status, isRetryableStatus(res.status))
  }
  return parseXmlRpcMethodResponse(text)
}

export function createXmlRpcClient(opts: XmlRpcOptions): OdooTransport {
  const base = opts.baseUrl.replace(/\/+$/, '')
  const fetchImpl = opts.fetchImpl ?? fetch
  let cachedUid = opts.uid

  async function uid(): Promise<number> {
    if (typeof cachedUid === 'number') return cachedUid
    const result = await xmlRpcCall(fetchImpl, `${base}/xmlrpc/2/common`, 'authenticate', [
      opts.databaseName,
      opts.login,
      opts.apiKey,
      {},
    ])
    if (typeof result !== 'number' || result === 0) {
      throw new OdooTransportError('XML-RPC authenticate failed', 401, false)
    }
    cachedUid = result
    return result
  }

  return {
    async call(model: string, method: string, namedArgs: OdooNamedArgs = {}) {
      const userId = await uid()
      return xmlRpcCall(fetchImpl, `${base}/xmlrpc/2/object`, 'execute_kw', [
        opts.databaseName,
        userId,
        opts.apiKey,
        model,
        method,
        [],
        namedArgs,
      ])
    },
  }
}

export async function xmlRpcAuthenticate(
  opts: Omit<XmlRpcOptions, 'uid'>
): Promise<number> {
  const base = opts.baseUrl.replace(/\/+$/, '')
  const fetchImpl = opts.fetchImpl ?? fetch
  const result = await xmlRpcCall(fetchImpl, `${base}/xmlrpc/2/common`, 'authenticate', [
    opts.databaseName,
    opts.login,
    opts.apiKey,
    {},
  ])
  if (typeof result !== 'number' || result === 0) {
    throw new OdooTransportError('XML-RPC authenticate failed', 401, false)
  }
  return result
}
