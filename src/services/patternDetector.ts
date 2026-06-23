import type { AutomatonModel, AutomatonTransition, IRNode } from '../types'

function buildOutMap(transitions: AutomatonTransition[]): Map<number, AutomatonTransition[]> {
  const map = new Map<number, AutomatonTransition[]>()
  for (const t of transitions) {
    if (!map.has(t.from)) map.set(t.from, [])
    map.get(t.from)!.push(t)
  }
  return map
}

// Run pattern detection on a single-thread (or single-automaton) sub-model.
function detectSingle(model: AutomatonModel): IRNode[] {
  const states = [...model.states].sort((a, b) => a.id - b.id)
  const outMap = buildOutMap(model.transitions)

  const result: IRNode[] = []
  const visited = new Set<number>()

  function collectConditionalChain(
    startId: number,
    startCond: string,
  ): { branches: Array<{ condition: string; stateId: number; actions: string }>; afterId?: number } {
    const branches: Array<{ condition: string; stateId: number; actions: string }> = []
    let curId: number | undefined = startId
    let curCond = startCond

    while (curId !== undefined) {
      const id = curId
      if (visited.has(id)) return { branches, afterId: id }

      const curState = states.find((s) => s.id === id)
      if (!curState) break

      const curOut = outMap.get(id) ?? []
      const selfLoop = curOut.find((t) => t.to === id)
      const backEdges = curOut.filter((t) => t.to < id)
      const fwdOut: AutomatonTransition[] = curOut.filter((t) => t.to > id)

      if (selfLoop || backEdges.length > 0 || fwdOut.length >= 2) {
        return { branches, afterId: id }
      }

      branches.push({ condition: curCond, stateId: curState.id, actions: curState.actions })

      if (fwdOut.length === 0 || curState.type === 'final') {
        return { branches, afterId: undefined }
      }

      const nextTrans: AutomatonTransition = fwdOut[0]
      if (nextTrans.condition === 'true') {
        return { branches, afterId: nextTrans.to }
      }

      curId = nextTrans.to
      curCond = nextTrans.condition
    }

    return { branches, afterId: undefined }
  }

  function visit(stateId: number): void {
    if (visited.has(stateId)) return

    const state = states.find((s) => s.id === stateId)
    if (!state) return
    visited.add(stateId)

    const out = outMap.get(stateId) ?? []
    const selfLoop = out.find((t) => t.to === stateId)
    const forwardOut = out.filter((t) => t.to > stateId).sort((a, b) => a.to - b.to)

    // ── DO2 (while): self-loop ────────────────────────────────────────────────
    if (selfLoop) {
      result.push({
        kind: 'DO2',
        condition: selfLoop.condition,
        body: state.actions,
        bodyStateId: stateId,
      })
      if (forwardOut[0]) visit(forwardOut[0].to)
      return
    }

    // ── IF1 (if/else): two forward outgoing from goto ─────────────────────────
    if (forwardOut.length >= 2) {
      const nearTo = forwardOut[0].to
      const joinId = forwardOut[forwardOut.length - 1].to
      const thenCond = forwardOut[forwardOut.length - 1].condition

      const elseBranchStates = states.filter((s) => s.id >= nearTo && s.id < joinId)
      result.push({
        kind: 'IF1',
        condition: thenCond,
        thenActions: state.actions,
        elseBranch: elseBranchStates.map((s) => ({ stateId: s.id, actions: s.actions })),
      })
      elseBranchStates.forEach((s) => visited.add(s.id))
      visit(joinId)
      return
    }

    // ── DO3 (do-while): next state has a back-edge to current ─────────────────
    if (forwardOut.length === 1) {
      const nextId = forwardOut[0].to
      const nextOut = outMap.get(nextId) ?? []
      const backToThis = nextOut.find((t) => t.to === stateId)

      if (backToThis) {
        visited.add(nextId)
        result.push({
          kind: 'DO3',
          body: state.actions,
          bodyStateId: stateId,
          conditionStateId: nextId,
          condition: backToThis.condition,
        })
        const exitTrans = nextOut.filter((t) => t.to > nextId)[0]
        if (exitTrans) visit(exitTrans.to)
        return
      }
    }

    // ── EX (linear) ──────────────────────────────────────────────────────────
    result.push({ kind: 'EX', stateId: stateId, actions: state.actions })

    const next = forwardOut[0]
    if (!next || state.type === 'final') {
      result.push({ kind: 'RETURN' })
      return
    }

    if (next.condition !== 'true') {
      const chain = collectConditionalChain(next.to, next.condition)
      if (chain.branches.length >= 1) {
        result.push({ kind: 'IF3', branches: chain.branches })
        chain.branches.forEach((b) => visited.add(b.stateId))
        if (chain.afterId !== undefined) visit(chain.afterId)
        else result.push({ kind: 'RETURN' })
        return
      }
    }

    visit(next.to)
  }

  if (states.length > 0) visit(states[0].id)

  return result
}

// Build a sub-model containing only states belonging to one thread.
function threadSubModel(model: AutomatonModel, thread: string): AutomatonModel {
  const states = model.states.filter((s) => (s.thread ?? '__main__') === thread)
  const ids = new Set(states.map((s) => s.id))
  const transitions = model.transitions.filter((t) => ids.has(t.from) && ids.has(t.to))
  const memo = model.memo.filter((m) => ids.has(m.stateId))
  return { states, transitions, memo, vars: model.vars, threads: [] }
}

export function detectPatterns(model: AutomatonModel): IRNode[] {
  if (model.threads.length <= 1) {
    return detectSingle(model)
  }

  // Multi-thread: emit a THREAD marker before each group's IR nodes
  const result: IRNode[] = []
  for (const thread of model.threads) {
    result.push({ kind: 'THREAD', name: thread })
    result.push(...detectSingle(threadSubModel(model, thread)))
  }
  return result
}
