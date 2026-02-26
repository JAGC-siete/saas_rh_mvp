/**
 * Parser for ZKTeco Push SDK ATTLOG format.
 * Format: PIN\tDatetime\tVerifyMethod\tWorkCode\t...\n (tab-separated)
 *
 * - PIN: User ID in the device (string or number)
 * - Datetime: YYYY-MM-DD HH:MM:SS (device local time)
 * - VerifyMethod: 0 = check-in, 1 = check-out (firmware variants may use 2, 3, etc.)
 */

export interface ParsedAttlogRecord {
  pin: string;
  datetime: string;
  verifyMethod: number;
  workCode?: string;
  raw: string;
}

/**
 * Parses a single line of ATTLOG format.
 * Returns null if the line is invalid or empty.
 */
function parseAttlogLine(line: string): ParsedAttlogRecord | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('\t');
  if (parts.length < 3) return null;

  const [pin, datetime, verifyMethodStr, workCode] = parts;
  if (!pin || !datetime || verifyMethodStr === undefined) return null;

  const verifyMethod = parseInt(verifyMethodStr, 10);
  if (isNaN(verifyMethod)) return null;

  return {
    pin: String(pin).trim(),
    datetime: datetime.trim(),
    verifyMethod,
    workCode: workCode?.trim() || undefined,
    raw: trimmed,
  };
}

/**
 * Parses ZKTeco ATTLOG body (tab-separated, one or more lines).
 * Returns array of valid parsed records; skips invalid lines.
 */
export function parseAttlogBody(body: string): ParsedAttlogRecord[] {
  if (!body || typeof body !== 'string') return [];

  const lines = body.split(/\r?\n/);
  const records: ParsedAttlogRecord[] = [];

  for (const line of lines) {
    const record = parseAttlogLine(line);
    if (record) records.push(record);
  }

  return records;
}

/**
 * Maps VerifyMethod to punch type.
 * 0 = check-in, 1 = check-out.
 * Other values (2, 3, etc.) are treated as alternating by order (first = in, second = out).
 */
export function isCheckIn(verifyMethod: number): boolean {
  switch (verifyMethod) {
    case 0:
      return true;
    case 1:
      return false;
    default:
      // Unknown values: treat even as in, odd as out (common convention)
      return verifyMethod % 2 === 0;
  }
}
