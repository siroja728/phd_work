// TS reference — full chain parse → detect → generateStructuredCpp, prints C++ source.
import { parsePredicates } from '../src/services/predicateParser.ts'
import { detectPatterns } from '../src/services/patternDetector.ts'
import { generateStructuredCpp } from '../src/services/codeGenerator.ts'

const input = await new Promise((resolve) => {
  let data = ''
  process.stdin.on('data', (c) => (data += c))
  process.stdin.on('end', () => resolve(data))
})

const { model } = parsePredicates(input)
const ir = detectPatterns(model)
process.stdout.write(generateStructuredCpp(model, ir).source)
