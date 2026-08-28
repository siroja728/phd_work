// TS reference — runs the ORIGINAL formatPredicates, prints result verbatim.
import { formatPredicates } from '../src/utils/formatPredicates.ts'

const input = await new Promise((resolve) => {
  let data = ''
  process.stdin.on('data', (c) => (data += c))
  process.stdin.on('end', () => resolve(data))
})

process.stdout.write(formatPredicates(input))
