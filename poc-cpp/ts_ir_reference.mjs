// TS reference — full chain parsePredicates → detectPatterns, prints IR as JSON.
import { parsePredicates } from '../src/services/predicateParser.ts'
import { detectPatterns } from '../src/services/patternDetector.ts'

const input = await new Promise((resolve) => {
  let data = ''
  process.stdin.on('data', (c) => (data += c))
  process.stdin.on('end', () => resolve(data))
})

const { model } = parsePredicates(input)
process.stdout.write(JSON.stringify(detectPatterns(model)))
