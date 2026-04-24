import type { AutomatonModel, GeneratedCode, IRNode } from '../types'
import { analyzeExpressions } from './stackParser'

// ── Action translation ────────────────────────────────────────────────────────

function translateAction(act: string): string {
  const readMatch = act.match(/^read\((.+)\)$/)
  if (readMatch) return `cin >> ${readMatch[1]}`

  const printMatch = act.match(/^print\((.+)\)$/)
  if (printMatch) return `cout << ${printMatch[1]} << endl`

  return act
}

// Expand all actions for one state into C++ lines.
// Arithmetic assignments are replaced with intermediate-code steps;
// simple assignments and read/print pass through unchanged.
function expandActions(actionsStr: string): string[] {
  const acts = actionsStr
    .split(';')
    .map((a) => a.trim())
    .filter(Boolean)
  const analyses = analyzeExpressions(actionsStr) // threaded temps within state
  const lines: string[] = []
  let analysisIdx = 0

  for (const act of acts) {
    const readMatch = act.match(/^read\((.+)\)$/)
    if (readMatch) {
      lines.push(`cin >> ${readMatch[1]}`)
      continue
    }

    const printMatch = act.match(/^print\((.+)\)$/)
    if (printMatch) {
      lines.push(`cout << ${printMatch[1]} << endl`)
      continue
    }

    const eqIdx = act.indexOf('=')
    if (eqIdx >= 0 && analysisIdx < analyses.length) {
      const lhs = act.slice(0, eqIdx).trim()
      const rhs = act.slice(eqIdx + 1).trim()
      if (/[+\-*/()]/.test(rhs)) {
        const { intermediateCode } = analyses[analysisIdx++]
        if (intermediateCode.length === 1) {
          // Single operation — assign directly, no temp needed
          const eqPos = intermediateCode[0].lastIndexOf('=')
          lines.push(`${lhs} = ${intermediateCode[0].slice(0, eqPos).trim()}`)
        } else {
          // Multiple steps — emit temp vars then final assignment
          for (let i = 0; i < intermediateCode.length; i++) {
            const eqPos = intermediateCode[i].lastIndexOf('=')
            const expr = intermediateCode[i].slice(0, eqPos).trim()
            const temp = intermediateCode[i].slice(eqPos + 1).trim()
            lines.push(
              i < intermediateCode.length - 1 ? `int ${temp} = ${expr}` : `${lhs} = ${expr}`,
            )
          }
        }
        continue
      }
    }

    lines.push(translateAction(act))
  }

  return lines
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
  'read',
  'print',
  'true',
  'false',
  'and',
  'or',
  'not',
  'endl',
  'cin',
  'cout',
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
  const varDecl = vars.length ? vars.map((v) => `    int ${v};`).join('\n') : '    int x;'

  const markReset = states.map((s) => `mark[${s.id}]`).join(' = ') + ' = false;'

  // Collect unique semaphore names
  const semNames = [...new Set(model.memo.map((e) => e.sem))]

  const lines: string[] = []

  lines.push('#include <iostream>')
  lines.push('#include <string>')
  lines.push('using namespace std;')
  lines.push('')
  lines.push(
    `bool mark[${n + 1}] = {${Array(n + 1)
      .fill('false')
      .join(', ')}};`,
  )
  if (semNames.length > 0) {
    for (const sem of semNames) {
      lines.push(`bool ${sem} = false;`)
    }
  }
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

    // Actions (arithmetic expanded via intermediate code)
    if (state.actions) {
      for (const line of expandActions(state.actions)) {
        lines.push(`                ${line};`)
      }
    }

    // Semaphore: acquire → call resource → release
    const memoEntry = model.memo.find((e) => e.stateId === state.id)
    if (memoEntry) {
      lines.push(`                // семафор`)
      lines.push(`                while (${memoEntry.sem});`)
      lines.push(`                ${memoEntry.sem} = true;`)
      lines.push(`                ${memoEntry.resource}();`)
      lines.push(`                ${memoEntry.sem} = false;`)
    }

    // Transitions
    const myTransitions = transitions.filter((t) => t.from === state.id)
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

// ── Structured code generator (uses IR) ──────────────────────────────────────

function emitSemaphore(sem: string, resource: string, indent: string): string[] {
  return [
    `${indent}while (${sem});`,
    `${indent}${sem} = true;`,
    `${indent}${resource}();`,
    `${indent}${sem} = false;`,
  ]
}

function irToLines(ir: IRNode[], indent: string, memo: AutomatonModel['memo']): string[] {
  const out: string[] = []

  for (const node of ir) {
    switch (node.kind) {
      case 'EX': {
        if (node.actions) {
          for (const line of expandActions(node.actions)) out.push(`${indent}${line};`)
        }
        const m = memo.find((e) => e.stateId === node.stateId)
        if (m) out.push(...emitSemaphore(m.sem, m.resource, indent))
        break
      }
      case 'IF1': {
        const cond = translateCondition(node.condition)
        if (node.thenActions) {
          out.push(`${indent}if (${cond}) {`)
          for (const line of expandActions(node.thenActions)) out.push(`${indent}    ${line};`)
          if (node.elseBranch.length > 0) {
            out.push(`${indent}} else {`)
            for (const branch of node.elseBranch) {
              if (branch.actions)
                for (const line of expandActions(branch.actions)) out.push(`${indent}    ${line};`)
              const m = memo.find((e) => e.stateId === branch.stateId)
              if (m) out.push(...emitSemaphore(m.sem, m.resource, `${indent}    `))
            }
          }
          out.push(`${indent}}`)
        } else if (node.elseBranch.length > 0) {
          out.push(`${indent}if (!(${cond})) {`)
          for (const branch of node.elseBranch) {
            if (branch.actions)
              for (const line of expandActions(branch.actions)) out.push(`${indent}    ${line};`)
            const m = memo.find((e) => e.stateId === branch.stateId)
            if (m) out.push(...emitSemaphore(m.sem, m.resource, `${indent}    `))
          }
          out.push(`${indent}}`)
        }
        break
      }
      case 'IF3': {
        node.branches.forEach((branch, i) => {
          const kw = i === 0 ? 'if' : 'else if'
          out.push(`${indent}${kw} (${translateCondition(branch.condition)}) {`)
          if (branch.actions)
            for (const line of expandActions(branch.actions)) out.push(`${indent}    ${line};`)
          const m = memo.find((e) => e.stateId === branch.stateId)
          if (m) out.push(...emitSemaphore(m.sem, m.resource, `${indent}    `))
          out.push(`${indent}}`)
        })
        break
      }
      case 'DO2': {
        out.push(`${indent}while (${translateCondition(node.condition)}) {`)
        if (node.body)
          for (const line of expandActions(node.body)) out.push(`${indent}    ${line};`)
        const m = memo.find((e) => e.stateId === node.bodyStateId)
        if (m) out.push(...emitSemaphore(m.sem, m.resource, `${indent}    `))
        out.push(`${indent}}`)
        break
      }
      case 'DO3': {
        out.push(`${indent}do {`)
        if (node.body)
          for (const line of expandActions(node.body)) out.push(`${indent}    ${line};`)
        const m = memo.find((e) => e.stateId === node.bodyStateId)
        if (m) out.push(...emitSemaphore(m.sem, m.resource, `${indent}    `))
        out.push(`${indent}} while (${translateCondition(node.condition)});`)
        break
      }
      case 'RETURN': {
        out.push(`${indent}return 0;`)
        break
      }
    }
  }

  return out
}

export function generateStructuredCpp(model: AutomatonModel, ir: IRNode[]): GeneratedCode {
  if (model.states.length === 0) return { language: 'cpp', source: '// no data' }

  const vars = extractVars(model)
  const varDecl = vars.length ? vars.map((v) => `    int ${v};`).join('\n') : '    int x;'
  const semNames = [...new Set(model.memo.map((e) => e.sem))]

  const lines: string[] = []
  lines.push('#include <iostream>')
  lines.push('using namespace std;')
  lines.push('')

  if (semNames.length > 0) {
    for (const sem of semNames) lines.push(`bool ${sem} = false;`)
    lines.push('')
  }

  lines.push('int main() {')
  lines.push(varDecl)
  lines.push('')

  for (const line of irToLines(ir, '    ', model.memo)) lines.push(line)

  lines.push('}')

  return { language: 'cpp', source: lines.join('\n') }
}
