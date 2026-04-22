import type { StackStep, ExpressionAnalysis } from '../types'

// ── Priority tables ───────────────────────────────────────────────────────────

// Priority when operator is already on the stack (comparison priority)
const STACK_PRIORITY: Record<string, number> = {
  '+': 1, '-': 1, '*': 2, '/': 2, '(': 0,
  'u+': 3, 'u-': 3,
}

// Priority when operator arrives (entry priority)
const ENTRY_PRIORITY: Record<string, number> = {
  '+': 1, '-': 1, '*': 2, '/': 2, '(': 3,
  'u+': 4, 'u-': 4,
}

// ── Token types ───────────────────────────────────────────────────────────────

type TokenKind = 'data' | 'action' | 'unary' | 'rparen'

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
      const prev = tokens[tokens.length - 1]
      const isUnary =
        (expr[i] === '-' || expr[i] === '+') &&
        (!prev || prev.kind === 'action' || prev.kind === 'unary')
      tokens.push({ val: expr[i], kind: isUnary ? 'unary' : 'action' })
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

// ── Pair stack entry ──────────────────────────────────────────────────────────

interface Pair {
  data: string | null   // null for '(' placeholder
  op: string            // operator stored as 'u-'/'u+' for unary
}

// ── Stack algorithm ───────────────────────────────────────────────────────────

interface StackAlgorithmResult {
  steps: StackStep[]
  intermediateCode: string[]
  tempCount: number
}

function runStackAlgorithm(expr: string, startTemp = 0): StackAlgorithmResult {
  const tokens = tokenize(expr)
  const steps: StackStep[] = []
  const intermediateCode: string[] = []

  const stack: Pair[] = []   // single stack of lexeme pairs
  let pendingData: string | null = null
  let tempCount = startTemp

  const newTemp = () => `t${++tempCount}`

  const stackStr = () =>
    stack.length
      ? '[' + stack.map(p => p.data !== null ? `${p.data} ${p.op}` : p.op).join(', ') + ']'
      : '[]'

  function pushStep(pair: string, action: string, code: string) {
    steps.push({
      step: steps.length + 1,
      pair,
      action,
      pairStack: stackStr(),
      code,
    })
  }

  // Pop the top pair and generate intermediate code using rightData as right operand.
  // Returns the temp variable name.
  function popAndGenerate(rightData: string): string {
    const top = stack.pop()!
    const isUnary = top.op === 'u-' || top.op === 'u+'
    const displayOp = isUnary ? top.op[1] : top.op
    const t = newTemp()
    const line = isUnary
      ? `${displayOp}${rightData} = ${t}`
      : `${top.data} ${displayOp} ${rightData} = ${t}`
    intermediateCode.push(line)
    return t
  }

  // Push operator onto the stack after popping any higher-or-equal priority operators.
  // If op is '(' push a placeholder pair with no data.
  // Otherwise bundle pendingData with op into a pair.
  function pushOp(op: string, pairLabel: string) {
    const prIn = ENTRY_PRIORITY[op]

    if (op === '(') {
      stack.push({ data: null, op: '(' })
      pushStep(pairLabel, 'ліва дужка → стек (пріоритет входу=3, порівняння=0)', '—')
      pendingData = null
      return
    }

    // Pop operators with higher or equal stack priority
    while (
      stack.length > 0 &&
      stack[stack.length - 1].op !== '(' &&
      STACK_PRIORITY[stack[stack.length - 1].op] >= prIn
    ) {
      const topOp = stack[stack.length - 1].op
      const displayTopOp = topOp.startsWith('u') ? topOp[1] : topOp
      const t = popAndGenerate(pendingData!)
      pushStep(
        pairLabel,
        `пріоритет(${op.startsWith('u') ? op[1] : op})=${prIn} <= стек → виштовхуємо '${displayTopOp}'`,
        intermediateCode[intermediateCode.length - 1],
      )
      pendingData = t
    }

    const isUnary = op === 'u-' || op === 'u+'
    if (isUnary) {
      // Unary has no data token — push with null data, pendingData stays
      stack.push({ data: null, op })
      const displayOp = op[1]
      pushStep(
        pairLabel,
        `унарний ${displayOp}: пріоритет входу=${prIn} → оператор у стек`,
        '—',
      )
    } else {
      stack.push({ data: pendingData, op })
      const displayOp = op.startsWith('u') ? op[1] : op
      if (steps.length > 0 && steps[steps.length - 1].action.includes('виштовхуємо')) {
        // already added step during pop loop above; add final push step
        pushStep(pairLabel, `оператор '${displayOp}' → стек`, '—')
      } else {
        pushStep(
          pairLabel,
          `пріоритет(${displayOp})=${prIn} > пріоритет стеку → оператор у стек`,
          '—',
        )
      }
      pendingData = null
    }
  }

  let i = 0
  while (i < tokens.length) {
    const tok = tokens[i]
    const nextTok = tokens[i + 1]

    if (tok.kind === 'data') {
      pendingData = tok.val

      if (!nextTok || nextTok.kind === 'rparen') {
        pushStep(
          tok.val + (nextTok ? ' )' : ' <кінець>'),
          'лексема даних → поточна пара',
          '—',
        )
        i++
      } else if (nextTok.kind === 'action') {
        const pairLabel = `${tok.val}  ${nextTok.val}`
        pushOp(nextTok.val, pairLabel)
        i += 2
      } else if (nextTok.kind === 'unary') {
        // data followed by unary shouldn't occur in valid exprs, treat data alone
        pushStep(tok.val, 'лексема даних → поточна пара', '—')
        i++
      } else {
        i++
      }

    } else if (tok.kind === 'unary') {
      const op = 'u' + tok.val
      const pairLabel = tok.val + (nextTok ? ` ${nextTok.val}` : '')
      pushOp(op, pairLabel)
      i++

    } else if (tok.kind === 'action') {
      if (tok.val === '(') {
        pushOp('(', '( [ліва дужка]')
      } else {
        // Standalone binary operator (after closing paren)
        pushOp(tok.val, tok.val)
      }
      i++

    } else if (tok.kind === 'rparen') {
      // Pop until matching '('
      while (stack.length > 0 && stack[stack.length - 1].op !== '(') {
        const topOp = stack[stack.length - 1].op
        const displayTopOp = topOp.startsWith('u') ? topOp[1] : topOp
        const t = popAndGenerate(pendingData!)
        pushStep(
          ') [права дужка]',
          `виштовхуємо '${displayTopOp}' до лівої дужки`,
          intermediateCode[intermediateCode.length - 1],
        )
        pendingData = t
      }
      // Remove '('
      if (stack.length > 0) {
        stack.pop()
        pushStep(') [права дужка]', 'знищуємо пару дужок', '—')
      }
      i++

    } else {
      i++
    }
  }

  // Flush remaining pairs
  while (stack.length > 0) {
    const top = stack[stack.length - 1]
    if (top.op === '(') { stack.pop(); break }
    const displayOp = top.op.startsWith('u') ? top.op[1] : top.op
    const t = popAndGenerate(pendingData!)
    pushStep(
      '<кінець рядка>',
      `стек не пустий → виштовхуємо '${displayOp}'`,
      intermediateCode[intermediateCode.length - 1],
    )
    pendingData = t
  }

  return { steps, intermediateCode, tempCount }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function analyzeExpressions(actionsStr: string, startTemp = 0): ExpressionAnalysis[] {
  const results: ExpressionAnalysis[] = []
  let runningTemp = startTemp
  const assignments = actionsStr.split(';').map(s => s.trim()).filter(Boolean)

  for (const assign of assignments) {
    const eqIdx = assign.indexOf('=')
    if (eqIdx < 0) continue
    const lhs = assign.slice(0, eqIdx).trim()
    const rhs = assign.slice(eqIdx + 1).trim()

    if (/[+\-*/()]/.test(rhs)) {
      const { steps, intermediateCode, tempCount } = runStackAlgorithm(rhs, runningTemp)
      if (steps.length > 0) {
        results.push({ expr: `${lhs} = ${rhs}`, steps, intermediateCode, tempCount })
        runningTemp = tempCount   // thread counter to next expression in same state
      }
    }
  }

  return results
}
