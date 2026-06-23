// ── Automaton model types ─────────────────────────────────────────────────────

export type StateType = 'initial' | 'final' | 'normal'

export interface AutomatonState {
  id: number
  type: StateType
  label: string | null // :name mark used for goto targeting
  actions: string // List_of_actions (raw string from predicate)
  mark: boolean
  thread?: string // @name prefix — undefined means single-thread mode
}

export interface AutomatonTransition {
  from: number
  condition: string
  to: number
}

export interface MemoEntry {
  stateId: number
  sem: string // semaphore name
  resource: string // subroutine name
}

export interface VarDeclaration {
  name: string
  cppType: string      // 'int' | 'float' | 'double' | 'bool' | 'char' | 'string'
  arraySize?: string   // defined → array, e.g. '10' or 'N'
  initializer?: string // optional init value, e.g. '0', 'N - 1'
}

export interface AutomatonModel {
  states: AutomatonState[]
  transitions: AutomatonTransition[]
  memo: MemoEntry[]
  vars: VarDeclaration[] // explicitly typed variable declarations
  threads: string[]      // distinct @thread names; empty = single-thread mode
}

// ── Stack algorithm types ─────────────────────────────────────────────────────

export interface StackStep {
  step: number
  pair: string // поточна пара лексем
  action: string // що відбувається
  pairStack: string // стек пар лексем (рядковий вигляд)
  code: string // згенерований рядок проміжного коду або '—'
}

export interface ExpressionAnalysis {
  expr: string // напр. "result = A * (B + C / D) - E"
  steps: StackStep[]
  intermediateCode: string[] // ["C / D = t1", "B + t1 = t2", ...]
  tempCount: number
}

// ── Predicate parsing types ───────────────────────────────────────────────────

export interface ParsedPredicate {
  condition: string
  actions: string
}

export interface ParseResult {
  model: AutomatonModel
  exprAnalysis: ExpressionAnalysis[]
}

// ── Intermediate representation (IR) types ───────────────────────────────────

export interface IRNodeEX {
  kind: 'EX'
  stateId: number
  actions: string
}

export interface IRNodeIF1 {
  kind: 'IF1'
  condition: string // "then" condition (the goto-jump condition)
  thenActions: string // actions of the state that jumps (the "then" body)
  elseBranch: Array<{ stateId: number; actions: string }>
}

export interface IRNodeIF3 {
  kind: 'IF3'
  branches: Array<{ condition: string; stateId: number; actions: string }>
}

export interface IRNodeDO2 {
  kind: 'DO2'
  condition: string
  body: string
  bodyStateId: number
}

export interface IRNodeDO3 {
  kind: 'DO3'
  body: string
  bodyStateId: number
  conditionStateId: number
  condition: string
}

export interface IRNodeRETURN {
  kind: 'RETURN'
}

export interface IRNodeTHREAD {
  kind: 'THREAD'
  name: string // @threadName
}

export type IRNode =
  | IRNodeEX
  | IRNodeIF1
  | IRNodeIF3
  | IRNodeDO2
  | IRNodeDO3
  | IRNodeRETURN
  | IRNodeTHREAD

// ── Code generation types ─────────────────────────────────────────────────────

export type TargetLanguage = 'cpp'

export interface GeneratedCode {
  language: TargetLanguage
  source: string
}
