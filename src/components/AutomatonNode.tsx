import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import type { NodeProps } from '@xyflow/react'
import type { AutomatonNodeData } from '../utils/graphLayout'

function AutomatonNodeComponent({ data }: NodeProps<AutomatonNodeData>) {
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
      {/* Top handle — receives edges */}
      <Handle type="target" position={Position.Top} className="automaton-handle" />

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

      {/* Bottom handle — emits edges */}
      <Handle type="source" position={Position.Bottom} className="automaton-handle" />
    </div>
  )
}

export const AutomatonNode = memo(AutomatonNodeComponent)
