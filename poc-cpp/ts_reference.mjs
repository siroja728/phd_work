// TS reference emitter — runs the ORIGINAL analyzeExpressions and prints the
// same JSON shape as the C++ PoC, so we can diff for byte-identical parity.
import { analyzeExpressions } from '../src/services/stackParser.ts'

const input = await new Promise((resolve) => {
  let data = ''
  process.stdin.on('data', (c) => (data += c))
  process.stdin.on('end', () => resolve(data))
})

const results = analyzeExpressions(input).map((a) => ({
  expr: a.expr,
  intermediateCode: a.intermediateCode,
  tempCount: a.tempCount,
}))

process.stdout.write(JSON.stringify(results))
