import type { AutomatonModel, GeneratedCode } from '../types'

// ── Action translation ────────────────────────────────────────────────────────

function translateAction(act: string): string {
  // read(x) → cin >> x
  const readMatch = act.match(/^read\((.+)\)$/)
  if (readMatch) return `cin >> ${readMatch[1]}`

  // print("...") or print(expr) → cout << ... << endl
  const printMatch = act.match(/^print\((.+)\)$/)
  if (printMatch) return `cout << ${printMatch[1]} << endl`

  // assignment — keep as-is
  return act
}

// ── Condition translation ─────────────────────────────────────────────────────

function translateCondition(cond: string): string {
  if (cond === 'true') return 'true'
  return cond
    .replace(/\band\b/gi, '&&')
    .replace(/\bor\b/gi, '||')
    .replace(/\bnot\b/gi, '!')
    .replace(/(?<![=!<>])=(?!=)/g, '==')
}

// ── Variable extraction ───────────────────────────────────────────────────────

const RESERVED = new Set([
  'read', 'print', 'true', 'false', 'and', 'or', 'not',
  'endl', 'cin', 'cout',
])

function extractVars(model: AutomatonModel): string[] {
  const vars = new Set<string>()
  const re = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g

  for (const state of model.states) {
    let m: RegExpExecArray | null
    re.lastIndex = 0
    while ((m = re.exec(state.actions)) !== null) {
      const v = m[1]
      if (!RESERVED.has(v.toLowerCase())) {
        vars.add(v)
      }
    }
  }

  return [...vars]
}

// ── Code generator ────────────────────────────────────────────────────────────

export function generateCpp(model: AutomatonModel): GeneratedCode {
  const { states, transitions } = model
  const n = states.length

  if (n === 0) return { language: 'cpp', source: '// немає даних' }

  const vars = extractVars(model)
  const varDecl = vars.length
    ? vars.map(v => `    int ${v};`).join('\n')
    : '    int x;'

  const markReset =
    states.map(s => `mark[${s.id}]`).join(' = ') + ' = false;'

  const lines: string[] = []

  lines.push('#include <iostream>')
  lines.push('#include <string>')
  lines.push('using namespace std;')
  lines.push('')
  lines.push(`bool mark[${n + 1}] = {${Array(n + 1).fill('false').join(', ')}};`)
  lines.push('')
  lines.push('int main() {')
  lines.push(varDecl)
  lines.push('    int current_state = 1;')
  lines.push('')
  lines.push('    while (true) {')
  lines.push('        switch (current_state) {')

  for (const state of states) {
    lines.push('')
    lines.push(`            case ${state.id}: {`)

    // Mark check
    lines.push(`                // перевірка Mark`)
    lines.push(`                if (mark[${state.id}]) {`)
    lines.push(`                    ${markReset}`)
    lines.push(`                    current_state = 1; break;`)
    lines.push(`                }`)
    lines.push(`                mark[${state.id}] = true;`)

    // Actions
    if (state.actions) {
      const acts = state.actions
        .split(';')
        .map(a => a.trim())
        .filter(Boolean)
      for (const act of acts) {
        lines.push(`                ${translateAction(act)};`)
      }
    }

    // Transitions
    const myTransitions = transitions.filter(t => t.from === state.id)
    if (myTransitions.length > 0) {
      lines.push(`                // переходи`)
      for (const tr of myTransitions) {
        const cond = translateCondition(tr.condition)
        lines.push(`                if (${cond}) { current_state = ${tr.to}; break; }`)
      }
    } else {
      lines.push(`                return 0;`)
    }

    lines.push(`                break;`)
    lines.push(`            }`)
  }

  lines.push('')
  lines.push('        }')
  lines.push('    }')
  lines.push('}')

  return { language: 'cpp', source: lines.join('\n') }
}
