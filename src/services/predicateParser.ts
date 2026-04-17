import type { ParsedPredicate, ParseResult, AutomatonState, AutomatonTransition } from '../types'
import { analyzeExpressions } from './stackParser'

// Parse a single line: "{ condition } [ actions ]"
function parseLine(line: string): ParsedPredicate {
  const condMatch = line.match(/\{([^}]*)\}/)
  const actMatch  = line.match(/\[([^\]]*)\]/)
  return {
    condition: condMatch ? condMatch[1].trim() : 'true',
    actions:   actMatch  ? actMatch[1].trim()  : '',
  }
}

export function parsePredicates(text: string): ParseResult {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { model: { states: [], transitions: [] }, exprAnalysis: [] }
  }

  const parsed = lines.map(parseLine)
  const states: AutomatonState[] = []
  const transitions: AutomatonTransition[] = []

  // First predicate → initial state (id = 1)
  states.push({
    id: 1,
    type: 'initial',
    actions: parsed[0].actions,
    mark: false,
  })

  // Remaining predicates → final states
  for (let i = 1; i < parsed.length; i++) {
    states.push({
      id: i + 1,
      type: 'final',
      actions: parsed[i].actions,
      mark: false,
    })
    // Transition from state 1 to each final state
    transitions.push({
      from: 1,
      condition: parsed[i].condition,
      to: i + 1,
    })
  }

  // Run stack algorithm on expressions found in any state's actions
  const exprAnalysis = states.flatMap(s =>
    s.actions ? analyzeExpressions(s.actions) : []
  )

  return {
    model: { states, transitions },
    exprAnalysis,
  }
}
