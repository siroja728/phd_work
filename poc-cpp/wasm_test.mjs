// Load the WASM module and prove process(text) matches the TS pipeline exactly.
import Module from './core_wasm.mjs'
import { EXAMPLES } from '../src/utils/examples.ts'
import { parsePredicates } from '../src/services/predicateParser.ts'
import { detectPatterns } from '../src/services/patternDetector.ts'
import { generateStructuredCpp } from '../src/services/codeGenerator.ts'

const m = await Module()
const process = m.cwrap('process', 'string', ['string'])

let pass = 0, fail = 0
for (const [name, src] of Object.entries(EXAMPLES)) {
  const wasm = JSON.parse(process(src))

  const { model } = parsePredicates(src)
  const ir = detectPatterns(model)
  const code = generateStructuredCpp(model, ir).source

  const okModel = JSON.stringify(wasm.model) === JSON.stringify(model)
  const okIr = JSON.stringify(wasm.ir) === JSON.stringify(ir)
  const okCode = wasm.code === code

  if (okModel && okIr && okCode) { pass++; console.log(`✓ ${name}  (model+ir+code match)`) }
  else {
    fail++
    console.log(`✗ ${name}  model:${okModel} ir:${okIr} code:${okCode}`)
    if (!okCode) {
      console.log('  --- WASM code ---'); console.log(wasm.code)
      console.log('  --- TS code ---'); console.log(code)
    }
  }
}
console.log(`\nWASM vs TS: ${pass} passed, ${fail} failed`)
