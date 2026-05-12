export interface Diagnostic {
  line: number // 1-based
  message: string
  hint: string
}

// ── Per-line validator ────────────────────────────────────────────────────────

function validateLine(raw: string, lineNum: number, definedLabels: Set<string>): Diagnostic[] {
  const diags: Diagnostic[] = []
  let rest = raw.trim()
  if (!rest) return []

  // @thread prefix
  const threadMatch = rest.match(/^@\w+\s*/)
  if (threadMatch) rest = rest.slice(threadMatch[0].length).trim()

  // :label prefix
  const labelMatch = rest.match(/^:\w+\s*/)
  if (labelMatch) rest = rest.slice(labelMatch[0].length).trim()

  // ── { condition } ──────────────────────────────────────────────────────────
  if (!rest.startsWith('{')) {
    diags.push({
      line: lineNum,
      message: 'Missing condition block',
      hint: 'Every state needs { condition } — use { true } for unconditional',
    })
    return diags
  }

  const condClose = rest.indexOf('}')
  if (condClose === -1) {
    if (rest.length > 1) {
      diags.push({
        line: lineNum,
        message: 'Unclosed {',
        hint: 'Add closing } after the condition',
      })
    }
    return diags
  }

  const condition = rest.slice(1, condClose).trim()
  if (!condition) {
    diags.push({
      line: lineNum,
      message: 'Empty condition',
      hint: 'Use { true } for an unconditional state',
    })
  }
  if (condition.includes(';')) {
    diags.push({
      line: lineNum,
      message: 'Semicolon inside condition',
      hint: "Conditions cannot contain ';' — use 'and' / 'or' to combine",
    })
  }

  rest = rest.slice(condClose + 1).trim()

  // ── [ actions ] ───────────────────────────────────────────────────────────
  if (!rest.startsWith('[')) {
    diags.push({
      line: lineNum,
      message: 'Missing action block',
      hint: 'Add [ actions ] after the condition — use [ ] for a no-op',
    })
    return diags
  }

  const actClose = rest.indexOf(']')
  if (actClose === -1) {
    diags.push({ line: lineNum, message: 'Unclosed [', hint: 'Add closing ] after the actions' })
    return diags
  }

  const actionsStr = rest.slice(1, actClose).trim()

  if (actionsStr && !actionsStr.trimEnd().endsWith(';')) {
    diags.push({
      line: lineNum,
      message: "Missing ';' after last action",
      hint: 'Every action must end with ; — e.g. [ read(x); k = 1; ]',
    })
  }

  // Validate individual actions
  if (actionsStr) {
    for (const act of actionsStr
      .split(';')
      .map((a) => a.trim())
      .filter(Boolean)) {
      const gotoMatch = act.match(/^goto\s+(\w+)$/)
      if (gotoMatch) {
        if (!definedLabels.has(gotoMatch[1])) {
          diags.push({
            line: lineNum,
            message: `Undefined label '${gotoMatch[1]}'`,
            hint: `Add :${gotoMatch[1]} as a prefix on a state line`,
          })
        }
        continue
      }

      if (/^read\s*\(/.test(act)) {
        if (!/^read\s*\(\s*[A-Za-z_]\w*\s*\)$/.test(act)) {
          diags.push({
            line: lineNum,
            message: 'Invalid read() syntax',
            hint: 'Use read(varName) — one identifier inside parentheses',
          })
        }
        continue
      }

      if (/^print\s*\(/.test(act)) {
        if (!/^print\s*\(.+\)$/.test(act)) {
          diags.push({
            line: lineNum,
            message: 'Invalid print() syntax',
            hint: 'Use print(expr) or print("string")',
          })
        }
        continue
      }

      // assignment: identifier = ...
      if (/^[A-Za-z_]\w*\s*=/.test(act)) continue

      diags.push({
        line: lineNum,
        message: `Unknown action: '${act}'`,
        hint: 'Valid actions: read(x), print(x), x = expr, goto label',
      })
    }
  }

  rest = rest.slice(actClose + 1).trim()

  // ── <sem: resource> (optional) ────────────────────────────────────────────
  if (rest.startsWith('<')) {
    const semClose = rest.indexOf('>')
    if (semClose === -1) {
      diags.push({
        line: lineNum,
        message: 'Unclosed <',
        hint: 'Add closing > to the semaphore annotation',
      })
    } else {
      const inner = rest.slice(1, semClose).trim()
      if (!/^\w+\s*:\s*\w+$/.test(inner)) {
        diags.push({
          line: lineNum,
          message: 'Invalid semaphore annotation',
          hint: 'Use <semName: resourceName> — e.g. <sem: sharedData>',
        })
      }
    }
  }

  return diags
}

// ── Public API ────────────────────────────────────────────────────────────────

export function validatePredicates(text: string): Diagnostic[] {
  const lines = text.split('\n')

  // First pass: collect defined labels (for goto validation)
  const definedLabels = new Set<string>()
  for (const line of lines) {
    let rest = line.trim()
    if (!rest) continue
    const tm = rest.match(/^@\w+\s*/)
    if (tm) rest = rest.slice(tm[0].length).trim()
    const lm = rest.match(/^:(\w+)/)
    if (lm) definedLabels.add(lm[1])
  }

  // Second pass: validate each line
  return lines.flatMap((line, i) => validateLine(line, i + 1, definedLabels))
}
