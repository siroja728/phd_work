// ─────────────────────────────────────────────────────────────────────────────
// core.ts — the app's boundary to the C++/WASM pipeline.
//
// The heavy transformation (predicates → model → IR → C++) runs in C++ compiled
// to WebAssembly. If the module fails to load, we transparently fall back to the
// original TypeScript services so the app never breaks.
//
// exprAnalysis (the Stack Trace visualization) is derived in TS from the parsed
// model — the stack algorithm itself is in the WASM core; only the step-by-step
// trace strings are produced here for display.
// ─────────────────────────────────────────────────────────────────────────────
import type { ParseResult, IRNode, AutomatonModel } from '../types'
import { analyzeExpressions } from '../services/stackParser'
// TS fallback services
import { parsePredicates } from '../services/predicateParser'
import { detectPatterns } from '../services/patternDetector'
import { generateStructuredCpp } from '../services/codeGenerator'
// @ts-expect-error — emscripten glue ships no type declarations
import Module from './core_wasm.mjs'

export type Engine = 'wasm' | 'ts'

export interface CoreResult {
  model: AutomatonModel
  exprAnalysis: ParseResult['exprAnalysis']
  ir: IRNode[]
  code: string
  engine: Engine
}

let processFn: ((text: string) => string) | null = null
let engine: Engine = 'ts'

// Load the WASM module once. Safe to call multiple times.
export async function initCore(): Promise<Engine> {
  if (processFn) return engine
  try {
    const m = await Module({
      // Serve the .wasm from /public regardless of the glue's default resolution.
      locateFile: (path: string) => (path.endsWith('.wasm') ? '/core_wasm.wasm' : path),
    })
    processFn = m.cwrap('process', 'string', ['string'])
    engine = 'wasm'
  } catch (err) {
    console.warn('[core] WASM load failed — falling back to TS pipeline:', err)
    engine = 'ts'
  }
  return engine
}

function exprAnalysisFrom(model: AutomatonModel): ParseResult['exprAnalysis'] {
  return model.states.flatMap((s) => (s.actions ? analyzeExpressions(s.actions) : []))
}

// Run the whole pipeline. Uses WASM when available, TS otherwise.
export function runCore(text: string): CoreResult {
  if (engine === 'wasm' && processFn) {
    const { model, ir, code } = JSON.parse(processFn(text)) as {
      model: AutomatonModel
      ir: IRNode[]
      code: string
    }
    return { model, exprAnalysis: exprAnalysisFrom(model), ir, code, engine: 'wasm' }
  }

  // ── TS fallback (identical output, proven byte-for-byte) ──
  const parsed = parsePredicates(text)
  const ir = detectPatterns(parsed.model)
  const code = generateStructuredCpp(parsed.model, ir).source
  return { model: parsed.model, exprAnalysis: parsed.exprAnalysis, ir, code, engine: 'ts' }
}
