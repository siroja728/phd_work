// TS reference — runs the ORIGINAL parsePredicates, prints model as JSON.
import { parsePredicates } from '../src/services/predicateParser.ts'

const input = await new Promise((resolve) => {
  let data = ''
  process.stdin.on('data', (c) => (data += c))
  process.stdin.on('end', () => resolve(data))
})

process.stdout.write(JSON.stringify(parsePredicates(input).model))
