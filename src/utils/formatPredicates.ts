// ── Condition normalizer ──────────────────────────────────────────────────────

function normalizeCondition(raw: string): string {
  return (
    raw
      .trim()
      // Multi-char operators first (must precede single-char passes)
      .replace(/\s*>=\s*/g, ' >= ')
      .replace(/\s*<=\s*/g, ' <= ')
      .replace(/\s*!=\s*/g, ' != ')
      .replace(/\s*==\s*/g, ' == ')
      // Single-char comparisons — only when not part of a two-char operator
      .replace(/([^<>!=])\s*>\s*(?![=])/g, '$1 > ')
      .replace(/([^<>!=])\s*<\s*(?![=])/g, '$1 < ')
      // Logical keywords — collapse surrounding whitespace
      .replace(/\s+and\s+/gi, ' and ')
      .replace(/\s+or\s+/gi, ' or ')
      .replace(/\bnot\s+/gi, 'not ')
      // Collapse multiple spaces
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
}

// ── Action normalizer ─────────────────────────────────────────────────────────

function normalizeSingleAction(act: string): string {
  const t = act.trim()
  if (!t) return ''

  // read(x)
  if (/^read\s*\(/.test(t)) return t.replace(/^read\s*\(/, 'read(')

  // print(x)
  if (/^print\s*\(/.test(t)) return t.replace(/^print\s*\(/, 'print(')

  // goto label
  const gotoMatch = t.match(/^goto\s+(\w+)$/)
  if (gotoMatch) return `goto ${gotoMatch[1]}`

  // assignment: lhs = rhs  (normalize spaces around =)
  const eqIdx = t.indexOf('=')
  if (eqIdx > 0) {
    const lhs = t.slice(0, eqIdx).trim()
    const rhs = t.slice(eqIdx + 1).trim()
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(lhs)) return `${lhs} = ${rhs}`
  }

  return t
}

function normalizeActions(raw: string): string {
  const acts = raw.split(';').map(normalizeSingleAction).filter(Boolean)
  return acts.length ? acts.join('; ') + ';' : ''
}

// ── Line formatter ────────────────────────────────────────────────────────────

function formatLine(line: string): string {
  const trimmed = line.trim()
  if (!trimmed) return ''

  let rest = trimmed
  const parts: string[] = []

  // Optional @thread prefix
  const threadMatch = rest.match(/^@(\w+)\s*(.*)$/)
  if (threadMatch) {
    parts.push(`@${threadMatch[1]}`)
    rest = threadMatch[2].trim()
  }

  // Optional :label prefix
  const labelMatch = rest.match(/^:(\w+)\s*(.*)$/)
  if (labelMatch) {
    parts.push(`:${labelMatch[1]}`)
    rest = labelMatch[2].trim()
  }

  // { condition }
  const condMatch = rest.match(/^\{([^}]*)\}\s*(.*)$/)
  if (!condMatch) return trimmed // unparseable — return unchanged
  parts.push(`{ ${normalizeCondition(condMatch[1])} }`)
  rest = condMatch[2].trim()

  // [ actions ]
  const actMatch = rest.match(/^\[([^\]]*)\]\s*(.*)$/)
  if (!actMatch) return trimmed
  parts.push(`[ ${normalizeActions(actMatch[1])} ]`)
  rest = actMatch[2].trim()

  // Optional <sem: resource>
  const memoMatch = rest.match(/<([^:>]+):([^>]+)>/)
  if (memoMatch) parts.push(`<${memoMatch[1].trim()}: ${memoMatch[2].trim()}>`)

  return parts.join(' ')
}

// ── Public API ────────────────────────────────────────────────────────────────

export function formatPredicates(text: string): string {
  const lines = text.split('\n').map(formatLine)

  // Collapse consecutive blank lines into a single blank line
  const out: string[] = []
  let prevBlank = false
  for (const line of lines) {
    const blank = line === ''
    if (blank && prevBlank) continue
    out.push(line)
    prevBlank = blank
  }

  return out.join('\n').trim()
}
