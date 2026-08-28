// Verify the app's WASM core produces byte-identical output to the TS pipeline.
// Loads the exact glue the app imports (src/core-wasm/core_wasm.mjs) and feeds it
// the wasm binary directly (no fetch), then diffs model + IR + generated C++
// across every built-in example.
//   npm run test:wasm
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Module from '../src/core-wasm/core_wasm.mjs'
import { EXAMPLES } from '../src/utils/examples.ts'
import { parsePredicates } from '../src/services/predicateParser.ts'
import { detectPatterns } from '../src/services/patternDetector.ts'
import { generateStructuredCpp } from '../src/services/codeGenerator.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const wasmBinary = fs.readFileSync(path.join(root, 'public/core_wasm.wasm'))

const m = await Module({
  // Same code path the browser uses, but hand it the binary so no server is needed.
  instantiateWasm(info, receive) {
    WebAssembly.instantiate(wasmBinary, info).then((r) => receive(r.instance))
    return {}
  },
})
const process = m.cwrap('process', 'string', ['string'])

let pass = 0
let fail = 0
for (const [name, src] of Object.entries(EXAMPLES)) {
  const w = JSON.parse(process(src))
  const { model } = parsePredicates(src)
  const ir = detectPatterns(model)
  const code = generateStructuredCpp(model, ir).source
  const ok =
    JSON.stringify(w.model) === JSON.stringify(model) &&
    JSON.stringify(w.ir) === JSON.stringify(ir) &&
    w.code === code
  ok ? pass++ : fail++
  console.log(`${ok ? '✓' : '✗'} ${name}`)
  if (!ok && w.code !== code) {
    console.log('  --- WASM ---\n' + w.code + '\n  --- TS ---\n' + code)
  }
}
console.log(`\nWASM vs TS: ${pass} passed, ${fail} failed`)
process_exit(fail === 0 ? 0 : 1)
function process_exit(c) {
  // eslint-disable-next-line no-undef
  globalThis.process?.exit?.(c)
}
