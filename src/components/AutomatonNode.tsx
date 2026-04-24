import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import type { Node, NodeProps } from '@xyflow/react'
import type { AutomatonNodeData } from '../utils/graphLayout'

function AutomatonNodeComponent({ data }: NodeProps<Node<AutomatonNodeData>>) {
  const { t } = useTranslation()

  const isInit = data.stateType === 'initial'
  const isFinal = data.stateType === 'final'

  const typeLabel = isInit
    ? t('diagram.initial')
    : isFinal
      ? t('diagram.final')
      : t('state_type.normal')

  const shortened = data.actions.length > 24 ? data.actions.slice(0, 24) + '…' : data.actions || '—'

  return (
    <div className={`automaton-node automaton-node--${data.stateType}`} title={data.actions || '—'}>
      {/* Top handle — receives forward edges */}
      <Handle type="target" position={Position.Top} className="automaton-handle" />

      {/* Left handles — for back-edges (loop return) */}
      <Handle
        type="source"
        id="left-out"
        position={Position.Left}
        className="automaton-handle automaton-handle--side"
        style={{ top: '50%' }}
      />
      <Handle
        type="target"
        id="left-in"
        position={Position.Left}
        className="automaton-handle automaton-handle--side"
        style={{ top: '50%' }}
      />

      {/* Right handles — for self-loop edges */}
      <Handle
        type="source"
        id="right-out"
        position={Position.Right}
        className="automaton-handle automaton-handle--side"
        style={{ top: '35%' }}
      />
      <Handle
        type="target"
        id="right-in"
        position={Position.Right}
        className="automaton-handle automaton-handle--side"
        style={{ top: '65%' }}
      />

      {/* Node content */}
      <div className="automaton-node__header">
        <span className="automaton-node__id">{data.label}</span>
        <span className={`automaton-node__badge automaton-node__badge--${data.stateType}`}>
          {typeLabel}
        </span>
      </div>

      {data.actions && <div className="automaton-node__actions">{shortened}</div>}

      {/* Double border ring for final states */}
      {isFinal && <div className="automaton-node__ring" />}

      {/* Bottom handle — emits forward edges */}
      <Handle type="source" position={Position.Bottom} className="automaton-handle" />
    </div>
  )
}

export const AutomatonNode = memo(AutomatonNodeComponent)
