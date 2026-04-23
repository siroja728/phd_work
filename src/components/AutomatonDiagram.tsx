import { useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { AutomatonModel } from '../types'
import { buildGraphElements } from '../utils/graphLayout'
import { AutomatonNode } from './AutomatonNode'
import type { AutomatonNodeData } from '../utils/graphLayout'

const NODE_TYPES = { automaton: AutomatonNode }

interface AutomatonDiagramProps {
  model: AutomatonModel
}

// Inner component — has access to ReactFlow context for fitView
function DiagramInner({ model }: AutomatonDiagramProps) {
  const { fitView } = useReactFlow()

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => buildGraphElements(model),
    // Stringify to detect deep changes in model
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
    [JSON.stringify(model)],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges)

  // Sync nodes/edges whenever model changes, then re-fit the view
  useEffect(() => {
    setNodes(layoutNodes)
    setEdges(layoutEdges)
    // Small delay so React Flow finishes laying out before fitView
    const timer = setTimeout(() => {
      fitView({ padding: 0.25, duration: 300 })
    }, 50)
    return () => clearTimeout(timer)
  }, [layoutNodes, layoutEdges, setNodes, setEdges, fitView])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.2}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
      colorMode="dark"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e2030" />
      <Controls
        showInteractive={false}
        style={{
          background: '#13141a',
          border: '1px solid #22242e',
          borderRadius: 6,
        }}
      />
      <MiniMap
        nodeColor={(node) => {
          const d = node.data as AutomatonNodeData
          if (d.stateType === 'initial') return '#6e84f7'
          if (d.stateType === 'final') return '#3dd68c'
          return '#f0c060'
        }}
        maskColor="rgba(11,12,18,0.7)"
        style={{
          background: '#13141a',
          border: '1px solid #22242e',
          borderRadius: 6,
        }}
      />
    </ReactFlow>
  )
}

// Outer component — provides ReactFlowProvider context
export function AutomatonDiagram({ model }: AutomatonDiagramProps) {
  const { t } = useTranslation()

  if (model.states.length === 0) {
    return (
      <div className="tab-empty">
        <div className="empty-icon">◎</div>
        <div className="empty-title">{t('diagram.empty')}</div>
      </div>
    )
  }

  return (
    <div className="reactflow-wrapper">
      <DiagramInner model={model} />
    </div>
  )
}
