import type { StackStep, ExpressionAnalysis } from '../types'

// ── Priority tables ───────────────────────────────────────────────────────────

// Priority for comparison inside the stack
const STACK_PRIORITY: Record<string, number> = {
  '+': 1, '-': 1, '*': 2, '/': 2, '(': 0,
}

// Priority on entry (left paren has highest entry priority)
const ENTRY_PRIORITY: Record<string, number> = {
  '+': 1, '-': 1, '*': 2, '/': 2, '(': 3,
}

// ── Token types ───────────────────────────────────────────────────────────────

type TokenKind = 'data' | 'action' | 'rparen'

interface Token {
  val: string
  kind: TokenKind
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue }

    if (/[A-Za-z_]/.test(expr[i])) {
      let j = i
      while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) j++
      tokens.push({ val: expr.slice(i, j), kind: 'data' })
      i = j; continue
    }

    if (/\d/.test(expr[i])) {
      let j = i
      while (j < expr.length && /[\d.]/.test(expr[j])) j++
      tokens.push({ val: expr.slice(i, j), kind: 'data' })
      i = j; continue
    }

    if (expr[i] in STACK_PRIORITY) {
      tokens.push({ val: expr[i], kind: 'action' })
      i++; continue
    }

    if (expr[i] === ')') {
      tokens.push({ val: ')', kind: 'rparen' })
      i++; continue
    }

    i++
  }
  return tokens
}

// ── Stack algorithm ───────────────────────────────────────────────────────────

interface StackAlgorithmResult {
  steps: StackStep[]
  intermediateCode: string[]
  tempCount: number
}

function runStackAlgorithm(expr: string): StackAlgorithmResult {
  const tokens = tokenize(expr)
  const steps: StackStep[] = []
  const intermediateCode: string[] = []

  const actionStack: string[] = []   // operator stack (лексеми дії)
  const dataStack: string[] = []     // operand stack (лексеми даних)
  let tempCount = 0

  const newTemp = () => `t${++tempCount}`
  const actionStackStr = () =>
    actionStack.length ? '[' + actionStack.join(', ') + ']' : '[]'
  const dataStackStr = () =>
    dataStack.length ? '[' + dataStack.join(', ') + ']' : '[]'

  // Pop operator from actionStack, pop two operands, push temp
  function processTop(): { op: string; a: string; b: string; result: string; line: string } {
    const op = actionStack.pop()!
    const b = dataStack.pop() ?? '?'
    const a = dataStack.pop() ?? '?'
    const t = newTemp()
    const line = `${a} ${op} ${b} = ${t}`
    intermediateCode.push(line)
    dataStack.push(t)
    return { op, a, b, result: t, line }
  }

  function pushStep(pair: string, action: string, code: string) {
    steps.push({
      step: steps.length + 1,
      pair,
      action,
      actionStack: actionStackStr(),
      dataStack: dataStackStr(),
      code,
    })
  }

  let i = 0
  while (i < tokens.length) {
    const tok = tokens[i]
    const nextTok = tokens[i + 1]

    // ── Data lexeme ───────────────────────────────────────────
    if (tok.kind === 'data') {

      if (!nextTok || nextTok.kind === 'rparen') {
        // Last data token before ')' or end of expression
        dataStack.push(tok.val)
        pushStep(
          tok.val + (nextTok ? ' )' : ' <кінець>'),
          'лексема даних → стек операндів',
          '—',
        )
        i++

      } else if (nextTok.kind === 'action') {
        // Pair: data lexeme + action lexeme
        const op = nextTok.val
        const prIn = ENTRY_PRIORITY[op]
        dataStack.push(tok.val)

        if (
          actionStack.length === 0 ||
          prIn > STACK_PRIORITY[actionStack[actionStack.length - 1]]
        ) {
          // Higher priority — push operator to stack
          actionStack.push(op)
          pushStep(
            `${tok.val}  ${op}`,
            `пріоритет(${op})=${prIn} > пріоритет стеку → оператор у стек`,
            '—',
          )
        } else {
          // Lower or equal priority — pop until higher priority found
          while (
            actionStack.length &&
            STACK_PRIORITY[actionStack[actionStack.length - 1]] >= prIn
          ) {
            const proc = processTop()
            pushStep(
              `${tok.val}  ${op}`,
              `пріоритет(${op})=${prIn} <= стек → виштовхуємо '${proc.op}'`,
              proc.line,
            )
          }
          actionStack.push(op)
          pushStep(
            `${tok.val}  ${op}`,
            `оператор '${op}' → стек`,
            '—',
          )
        }
        i += 2 // skip both data and action tokens

      } else {
        dataStack.push(tok.val)
        i++
      }

    // ── Left paren ────────────────────────────────────────────
    } else if (tok.kind === 'action' && tok.val === '(') {
      actionStack.push('(')
      pushStep(
        '( [ліва дужка]',
        'ліва дужка → стек (пріоритет входу=3, порівняння=0)',
        '—',
      )
      i++

    // ── Right paren ───────────────────────────────────────────
    } else if (tok.kind === 'rparen') {
      // Pop everything until left paren
      while (actionStack.length && actionStack[actionStack.length - 1] !== '(') {
        const proc = processTop()
        pushStep(
          ') [права дужка]',
          `виштовхуємо '${proc.op}' до лівої дужки`,
          proc.line,
        )
      }
      // Destroy the left paren
      if (actionStack.length) {
        actionStack.pop()
        pushStep(') [права дужка]', 'знищуємо пару дужок', '—')
      }
      i++

    } else {
      i++
    }
  }

  // Flush remaining operators
  while (actionStack.length) {
    const top = actionStack[actionStack.length - 1]
    if (top === '(') { actionStack.pop(); break }
    const proc = processTop()
    pushStep(
      '<кінець рядка>',
      `стек не пустий → виштовхуємо '${proc.op}'`,
      proc.line,
    )
  }

  return { steps, intermediateCode, tempCount }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function analyzeExpressions(actionsStr: string): ExpressionAnalysis[] {
  const results: ExpressionAnalysis[] = []
  const assignments = actionsStr.split(';').map(s => s.trim()).filter(Boolean)

  for (const assign of assignments) {
    const eqIdx = assign.indexOf('=')
    if (eqIdx < 0) continue
    const lhs = assign.slice(0, eqIdx).trim()
    const rhs = assign.slice(eqIdx + 1).trim()

    if (/[+\-*/()]/.test(rhs)) {
      const { steps, intermediateCode, tempCount } = runStackAlgorithm(rhs)
      if (steps.length > 0) {
        results.push({ expr: `${lhs} = ${rhs}`, steps, intermediateCode, tempCount })
      }
    }
  }

  return results
}
