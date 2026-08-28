// ─────────────────────────────────────────────────────────────────────────────
// core.ts — thin TS wrapper around the C++/WASM core.
//
// This is the integration layer: the React app imports THIS instead of the
// hand-written TS services. The API shape is unchanged, so App.tsx / Editor.tsx
// keep working. The heavy lifting now happens in C++ compiled to WebAssembly.
//
// Place core_wasm.mjs + core_wasm.wasm next to this file (or under /public) and
// let Vite serve the .wasm. Build them with:
//   em++ -std=c++17 -O2 wasm_main.cpp -o core_wasm.mjs -s MODULARIZE=1 \
//        -s EXPORT_ES6=1 -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap']" \
//        -s ALLOW_MEMORY_GROWTH=1 -s ENVIRONMENT=web
// ─────────────────────────────────────────────────────────────────────────────
import type { AutomatonModel, IRNode } from '../src/types'
// @ts-expect-error — emscripten glue has no types
import Module from './core_wasm.mjs'

export interface CoreResult {
  model: AutomatonModel
  ir: IRNode[]
  code: string
}

let _process: ((text: string) => string) | null = null

// Load the WASM module once (async). Call this at app startup.
export async function initCore(): Promise<void> {
  const m = await Module()
  _process = m.cwrap('process', 'string', ['string'])
}

// The whole pipeline in one call: parse → detect patterns → generate C++.
export function runCore(text: string): CoreResult {
  if (!_process) throw new Error('core not initialised — await initCore() first')
  return JSON.parse(_process(text)) as CoreResult
}

// ─────────────────────────────────────────────────────────────────────────────
// How App.tsx would use it (replacing the three TS imports):
//
//   import { initCore, runCore } from './core-wasm/core'
//   useEffect(() => { initCore().then(() => setReady(true)) }, [])
//   function handleRun() {
//     const { model, ir, code } = runCore(text)
//     setResult({ model, exprAnalysis: [] })   // exprAnalysis: expose separately if needed
//     setIr(ir)
//     setGenerated({ language: 'cpp', source: code })
//   }
// ─────────────────────────────────────────────────────────────────────────────
