import type { AutomatonModel, GeneratedCode, IRNode } from '../types'
import { analyzeExpressions } from './stackParser'

// ── Action translation ────────────────────────────────────────────────────────

function translateAction(act: string): string {
  const readMatch = act.match(/^read\((.+)\)$/)
  if (readMatch) return `cin >> ${readMatch[1]}`

  const printMatch = act.match(/^print\((.+)\)$/)
  if (printMatch) return `cout << ${printMatch[1]} << endl`

  // Normalize simple assignment spacing: x=5 or x =5 → x = 5
  const assignMatch = act.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/)
  if (assignMatch) return `${assignMatch[1]} = ${assignMatch[2]}`

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

// ── Variable declarations ─────────────────────────────────────────────────────

const RESERVED = new Set([
  'read', 'print', 'true', 'false', 'and', 'or', 'not',
  'endl', 'cin', 'cout',
  'int', 'integer', 'float', 'double', 'bool', 'char', 'symb', 'string',
])

// Collect identifiers from actions that are not in model.vars (fallback to int)
function extractUndeclaredVars(model: AutomatonModel): string[] {
  const declared = new Set(model.vars.map((v) => v.name))
  const found = new Set<string>()
  const re = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g

  for (const state of model.states) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(state.actions)) !== null) {
      const v = m[1]
      if (!RESERVED.has(v.toLowerCase()) && !declared.has(v)) found.add(v)
    }
  }
  return [...found]
}

// Build C++ variable declaration lines.
// indent: leading spaces  |  forGlobal: emit default init values for numeric types
function buildVarLines(model: AutomatonModel, indent: string, forGlobal = false): string[] {
  const lines: string[] = []

  for (const v of model.vars) {
    if (v.arraySize) {
      // Arrays never get a scalar initializer in the declaration line
      lines.push(`${indent}${v.cppType} ${v.name}[${v.arraySize}];`)
    } else {
      const init = v.initializer ?? (forGlobal ? defaultInit(v.cppType) : null)
      lines.push(`${indent}${v.cppType} ${v.name}${init ? ` = ${init}` : ''};`)
    }
  }

  // Fallback: undeclared identifiers found in actions → int
  for (const name of extractUndeclaredVars(model)) {
    lines.push(`${indent}int ${name}${forGlobal ? ' = 0' : ''};`)
  }

  if (lines.length === 0) lines.push(`${indent}int x;`)
  return lines
}

function defaultInit(cppType: string): string | null {
  switch (cppType) {
    case 'int':    return '0'
    case 'float':  return '0.0f'
    case 'double': return '0.0'
    case 'bool':   return 'false'
    case 'char':   return "'\\0'"
    default:       return null
  }
}

// ── Code generator ────────────────────────────────────────────────────────────

export function generateCpp(model: AutomatonModel): GeneratedCode {
  const { states, transitions } = model
  const n = states.length

  if (n === 0) return { language: 'cpp', source: '// немає даних' }

  const varDecl = buildVarLines(model, '    ').join('\n')
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

// Emit a state's body: actions wrapped in a lock_guard (parallel) or followed
// by a spin-lock (sequential), or just plain action lines when no memo entry.
function emitStateBody(
  actions: string | undefined,
  stateId: number,
  indent: string,
  memo: AutomatonModel['memo'],
  parallel: boolean,
): string[] {
  const m = memo.find((e) => e.stateId === stateId)
  const inner = m && parallel ? indent + '    ' : indent
  const actionLines = actions ? expandActions(actions).map((l) => `${inner}${l};`) : []

  if (!m) return actionLines

  if (parallel) {
    // Wrap actions inside lock_guard; mutex is named after the resource
    return [
      `${indent}{`,
      `${indent}    lock_guard<mutex> _lock(${m.resource}_mtx);`,
      ...actionLines,
      `${indent}}`,
    ]
  }

  // Sequential spin-lock: actions first, then acquire → call → release
  return [
    ...actionLines,
    `${indent}while (${m.sem});`,
    `${indent}${m.sem} = true;`,
    `${indent}${m.resource}();`,
    `${indent}${m.sem} = false;`,
  ]
}

function irToLines(
  ir: IRNode[],
  indent: string,
  memo: AutomatonModel['memo'],
  parallel = false,
): string[] {
  const out: string[] = []

  for (const node of ir) {
    switch (node.kind) {
      case 'THREAD':
        break // handled by caller
      case 'EX': {
        out.push(...emitStateBody(node.actions, node.stateId, indent, memo, parallel))
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
              out.push(
                ...emitStateBody(branch.actions, branch.stateId, `${indent}    `, memo, parallel),
              )
            }
          }
          out.push(`${indent}}`)
        } else if (node.elseBranch.length > 0) {
          out.push(`${indent}if (!(${cond})) {`)
          for (const branch of node.elseBranch) {
            out.push(
              ...emitStateBody(branch.actions, branch.stateId, `${indent}    `, memo, parallel),
            )
          }
          out.push(`${indent}}`)
        }
        break
      }
      case 'IF3': {
        node.branches.forEach((branch, i) => {
          const kw = i === 0 ? 'if' : 'else if'
          out.push(`${indent}${kw} (${translateCondition(branch.condition)}) {`)
          out.push(
            ...emitStateBody(branch.actions, branch.stateId, `${indent}    `, memo, parallel),
          )
          out.push(`${indent}}`)
        })
        break
      }
      case 'DO2': {
        out.push(`${indent}while (${translateCondition(node.condition)}) {`)
        out.push(...emitStateBody(node.body, node.bodyStateId, `${indent}    `, memo, parallel))
        out.push(`${indent}}`)
        break
      }
      case 'DO3': {
        out.push(`${indent}do {`)
        out.push(...emitStateBody(node.body, node.bodyStateId, `${indent}    `, memo, parallel))
        out.push(`${indent}} while (${translateCondition(node.condition)});`)
        break
      }
      case 'RETURN': {
        // void thread functions use bare return; main() uses return 0;
        out.push(parallel ? `${indent}return;` : `${indent}return 0;`)
        break
      }
    }
  }

  return out
}

// ── Parallel code generator ───────────────────────────────────────────────────

// Hoist ALL actions from the first EX node of a thread into main() so the
// entire initial state (reads, variable init, constants) runs sequentially
// before any thread is spawned.
function extractSetupActions(nodes: IRNode[]): { setupLines: string[]; remaining: IRNode[] } {
  if (nodes.length === 0 || nodes[0].kind !== 'EX') {
    return { setupLines: [], remaining: nodes }
  }

  const first = nodes[0]
  if (!first.actions) return { setupLines: [], remaining: nodes.slice(1) }

  const setupLines = expandActions(first.actions).map((line) => `    ${line};`)

  return { setupLines, remaining: nodes.slice(1) }
}

function generateParallelCpp(model: AutomatonModel, ir: IRNode[]): GeneratedCode {
  const resourceNames = [...new Set(model.memo.map((e) => e.resource))]

  // Split flat IR into per-thread groups using THREAD markers
  const rawGroups: Array<{ name: string; nodes: IRNode[] }> = []
  let curNodes: IRNode[] = []
  let curName = ''
  for (const node of ir) {
    if (node.kind === 'THREAD') {
      if (curName) rawGroups.push({ name: curName, nodes: curNodes })
      curName = node.name
      curNodes = []
    } else {
      curNodes.push(node)
    }
  }
  if (curName) rawGroups.push({ name: curName, nodes: curNodes })

  // Hoist initial reads out of each thread into main()
  const groups = rawGroups.map(({ name, nodes }) => {
    const { setupLines, remaining } = extractSetupActions(nodes)
    return { name, nodes: remaining, setupLines }
  })

  const lines: string[] = []
  lines.push('#include <iostream>')
  lines.push('#include <string>')
  lines.push('#include <thread>')
  lines.push('#include <mutex>')
  lines.push('using namespace std;')
  lines.push('')

  const globalVarLines = buildVarLines(model, '', true).filter((l) => l !== 'int x;')
  if (globalVarLines.length > 0) {
    lines.push('// shared variables')
    for (const l of globalVarLines) lines.push(l)
    lines.push('')
  }

  if (resourceNames.length > 0) {
    for (const res of resourceNames) lines.push(`mutex ${res}_mtx;`)
    lines.push('')
  }

  for (const { name, nodes } of groups) {
    lines.push(`void ${name}() {`)
    for (const line of irToLines(nodes, '    ', model.memo, true)) lines.push(line)
    lines.push('}')
    lines.push('')
  }

  lines.push('int main() {')

  // Sequential reads before any thread starts
  const allSetup = groups.flatMap((g) => g.setupLines)
  if (allSetup.length > 0) {
    lines.push('    // read inputs before spawning threads')
    for (const line of allSetup) lines.push(line)
    lines.push('')
  }

  for (const { name } of groups) lines.push(`    thread t_${name}(${name});`)
  if (groups.length > 0) lines.push('')
  for (const { name } of groups) lines.push(`    t_${name}.join();`)
  lines.push('    return 0;')
  lines.push('}')

  return { language: 'cpp', source: lines.join('\n') }
}

// ── Sequential structured code generator ─────────────────────────────────────

export function generateStructuredCpp(model: AutomatonModel, ir: IRNode[]): GeneratedCode {
  if (model.states.length === 0) return { language: 'cpp', source: '// no data' }

  if (model.threads.length > 1) return generateParallelCpp(model, ir)

  const varDecl = buildVarLines(model, '    ').join('\n')
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
