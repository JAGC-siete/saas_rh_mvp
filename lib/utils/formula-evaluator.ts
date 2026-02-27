/**
 * Safe client-side formula evaluator.
 * Uses a simple recursive descent parser - NO eval(), Function(), or dynamic code.
 * Only allows: numbers, +, -, *, /, (, ), and variable names (replaced with values).
 */

/**
 * Evaluate a simple math expression (numbers and + - * / only).
 * Variables must be replaced before calling this.
 */
function evaluateMathOnly(expr: string): number {
  const clean = expr.replace(/\s+/g, '')
  if (!clean || !/^[0-9+\-*/().]+$/.test(clean)) {
    return 0
  }
  try {
    // Parse with a simple recursive descent - no eval/Function
    let i = 0
    function parseExpr(): number {
      let left = parseTerm()
      while (i < clean.length) {
        const c = clean[i]
        if (c === '+') {
          i++
          left += parseTerm()
        } else if (c === '-') {
          i++
          left -= parseTerm()
        } else {
          break
        }
      }
      return left
    }
    function parseTerm(): number {
      let left = parseFactor()
      while (i < clean.length) {
        const c = clean[i]
        if (c === '*') {
          i++
          left *= parseFactor()
        } else if (c === '/') {
          i++
          const right = parseFactor()
          left = right === 0 ? 0 : left / right
        } else {
          break
        }
      }
      return left
    }
    function parseFactor(): number {
      if (clean[i] === '(') {
        i++
        const v = parseExpr()
        if (clean[i] === ')') i++
        return v
      }
      let num = ''
      if (clean[i] === '-') {
        num += clean[i++]
      }
      while (i < clean.length && /[0-9.]/.test(clean[i])) {
        num += clean[i++]
      }
      const n = parseFloat(num)
      if (!isNaN(n) && isFinite(n)) return n
      return 0
    }
    const result = parseExpr()
    return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : 0
  } catch {
    return 0
  }
}

/**
 * Evaluate formula with variable substitution.
 * context: { baseSalary, metadata } - metadata keys become variable values
 */
export function evaluateFormulaSafe(
  formula: string,
  context: { baseSalary: number; metadata: Record<string, number | string | boolean> }
): number {
  if (!formula || typeof formula !== 'string') return 0

  let safe = formula.trim()
  // Replace metadata.field and direct field names with values
  const replacer = (match: string, fieldName: string) => {
    const value = context.metadata[fieldName]
    if (value === undefined || value === null) return '0'
    if (typeof value === 'boolean') return value ? '1' : '0'
    if (typeof value === 'number') return String(value)
    return String(parseFloat(String(value)) || 0)
  }
  safe = safe.replace(/metadata\.([a-z_][a-z0-9_]*)/gi, replacer)
  safe = safe.replace(/\b([a-z_][a-z0-9_]*)\b/g, (m, name) => {
    if (name === 'baseSalary' || name === 'base_salary') return String(context.baseSalary)
    return replacer(m, name)
  })
  return evaluateMathOnly(safe)
}
