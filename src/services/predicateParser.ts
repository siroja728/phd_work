import type { ParseResult, AutomatonState, AutomatonTransition, MemoEntry } from '../types'
import { analyzeExpressions } from './stackParser'

interface RawPredicate {
  thread: string | null // @name prefix
  label: string | null
  condition: string
  actions: string // goto-stripped, ready for model
  gotos: string[] // label names extracted from goto statements
  sem: string | null // semaphore name from <sem: resource>
  resource: string | null // resource subroutine from <sem: resource>
}

function parseLine(line: string): RawPredicate {
  // Optional @thread prefix
  const threadMatch = line.match(/^@(\w+)\s+(.*)$/)
  const thread = threadMatch ? threadMatch[1] : null
  const rest0 = threadMatch ? threadMatch[2] : line

  // Optional :label prefix
  const labelMatch = rest0.match(/^:(\w+)\s+(.*)$/)
  const label = labelMatch ? labelMatch[1] : null
  const rest = labelMatch ? labelMatch[2] : rest0

  const condMatch = rest.match(/\{([^}]*)\}/)
  const actMatch = rest.match(/\[([^\]]*)\]/)
  const memoMatch = rest.match(/<([^:>]+):([^>]+)>/)
  const raw = actMatch ? actMatch[1] : ''

  // Extract all goto targets
  const gotos: string[] = []
  const gotoRe = /\bgoto\s+(\w+)/g
  let m: RegExpExecArray | null
  while ((m = gotoRe.exec(raw)) !== null) gotos.push(m[1])

  // Strip goto statements from actions
  const actions = raw
    .replace(/\bgoto\s+\w+/g, '')
    .split(';')
    .map((a) => a.trim())
    .filter(Boolean)
    .join('; ')

  return {
    thread,
    label,
    condition: condMatch ? condMatch[1].trim() : 'true',
    actions,
    gotos,
    sem: memoMatch ? memoMatch[1].trim() : null,
    resource: memoMatch ? memoMatch[2].trim() : null,
  }
}

export function parsePredicates(text: string): ParseResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return {
      model: { states: [], transitions: [], memo: [], threads: [] },
      exprAnalysis: [],
    }
  }

  const parsed = lines.map(parseLine)
  const n = parsed.length

  // Collect distinct thread names (preserving order of first appearance)
  const threadNames: string[] = []
  for (const p of parsed) {
    if (p.thread && !threadNames.includes(p.thread)) threadNames.push(p.thread)
  }

  // Group indices by thread (null → '__main__' in single-thread mode)
  const groupOf = (p: RawPredicate) => p.thread ?? '__main__'
  const groupIndices = new Map<string, number[]>()
  parsed.forEach((p, i) => {
    const g = groupOf(p)
    if (!groupIndices.has(g)) groupIndices.set(g, [])
    groupIndices.get(g)!.push(i)
  })

  // Build label → stateId map — labels are scoped per thread to avoid clashes
  // Key: "thread:label"
  const labelMap = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    if (parsed[i].label) {
      const key = `${groupOf(parsed[i])}:${parsed[i].label}`
      labelMap.set(key, i + 1)
    }
  }

  const states: AutomatonState[] = []
  const transitions: AutomatonTransition[] = []

  for (let i = 0; i < n; i++) {
    const p = parsed[i]
    const id = i + 1
    const g = groupOf(p)
    const gIdx = groupIndices.get(g)!
    const posInGroup = gIdx.indexOf(i)

    const isFirst = posInGroup === 0
    const isLast = posInGroup === gIdx.length - 1 && p.gotos.length === 0
    const type = isFirst ? 'initial' : isLast ? 'final' : 'normal'

    states.push({
      id,
      type,
      label: p.label,
      actions: p.actions,
      mark: false,
      thread: p.thread ?? undefined,
    })

    // Sequential transition: only within the same thread group
    if (posInGroup > 0) {
      const prevId = gIdx[posInGroup - 1] + 1
      transitions.push({ from: prevId, condition: p.condition, to: id })
    }

    // Goto transitions — resolved within the same thread's label space
    for (const target of p.gotos) {
      const key = `${g}:${target}`
      const toId = labelMap.get(key)
      if (toId !== undefined) {
        transitions.push({ from: id, condition: p.condition, to: toId })
      }
    }
  }

  // Build memo entries
  const memo: MemoEntry[] = parsed
    .map((p, i) =>
      p.sem && p.resource ? { stateId: i + 1, sem: p.sem, resource: p.resource } : null,
    )
    .filter((e): e is MemoEntry => e !== null)

  const exprAnalysis = states.flatMap((s) => (s.actions ? analyzeExpressions(s.actions) : []))

  return {
    model: { states, transitions, memo, threads: threadNames },
    exprAnalysis,
  }
}
