import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'
import type { AutomatonModel } from '../types'

const NODE_WIDTH = 180
const NODE_HEIGHT = 60

export interface AutomatonNodeData extends Record<string, unknown> {
  stateId: number
  stateType: 'initial' | 'normal' | 'final'
  actions: string
  label: string
}

export interface AutomatonEdgeData extends Record<string, unknown> {
  condition: string
}

export function buildGraphElements(model: AutomatonModel): {
  nodes: Node<AutomatonNodeData>[]
  edges: Edge<AutomatonEdgeData>[]
} {
  const { states, transitions } = model

  // ── Dagre layout ──────────────────────────────────────────────────────────
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'TB', // top → bottom
    nodesep: 60, // horizontal gap between nodes
    ranksep: 80, // vertical gap between ranks
    marginx: 20,
    marginy: 20,
  })

  states.forEach((s) => {
    g.setNode(String(s.id), { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  transitions.forEach((tr, i) => {
    // Skip self-loops and back-edges from dagre — they don't affect rank order
    if (tr.from !== tr.to && tr.from < tr.to) {
      g.setEdge(String(tr.from), String(tr.to), { id: `e${i}` })
    }
  })

  dagre.layout(g)

  // ── Build React Flow nodes ─────────────────────────────────────────────
  const nodes: Node<AutomatonNodeData>[] = states.map((s) => {
    const pos = g.node(String(s.id))
    return {
      id: String(s.id),
      type: 'automaton', // custom node type
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
      data: {
        stateId: s.id,
        stateType: s.type,
        actions: s.actions,
        label: `S${s.id}`,
      },
    }
  })

  // ── Build React Flow edges ─────────────────────────────────────────────
  // Group parallel edges (same from→to) to offset labels
  const edgeCounts: Record<string, number> = {}

  const edges: Edge<AutomatonEdgeData>[] = transitions.map((tr, i) => {
    const key = `${tr.from}-${tr.to}`
    edgeCounts[key] = (edgeCounts[key] ?? 0) + 1

    const isSelfLoop = tr.from === tr.to
    const isBackEdge = !isSelfLoop && tr.from > tr.to

    return {
      id: `e${i}`,
      source: String(tr.from),
      target: String(tr.to),
      type: isSelfLoop ? 'selfloop' : 'smoothstep',
      ...(isSelfLoop
        ? { sourceHandle: 'right-out', targetHandle: 'right-in' }
        : isBackEdge
          ? { sourceHandle: 'left-out', targetHandle: 'left-in' }
          : {}),
      animated: false,
      label: tr.condition,
      // Self-loop labels are rendered inside LoopEdge via EdgeLabelRenderer
      ...(isSelfLoop
        ? {}
        : {
            labelStyle: {
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fill: '#f0c060',
              fontWeight: 500,
            },
            labelBgStyle: {
              fill: '#0f1117',
              fillOpacity: 0.85,
            },
            labelBgPadding: [4, 6] as [number, number],
            labelBgBorderRadius: 3,
          }),
      style: {
        stroke: '#6e84f7',
        strokeWidth: 1.5,
        strokeOpacity: 0.7,
      },
      markerEnd: {
        type: 'arrowclosed' as const,
        color: '#6e84f7',
        width: 16,
        height: 16,
      },
      data: { condition: tr.condition },
    }
  })

  return { nodes, edges }
}

export const NODE_DIMENSIONS = { width: NODE_WIDTH, height: NODE_HEIGHT }
