import { memo } from 'react'
import { EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

// Custom edge for self-loops (source === target).
// Draws a bezier arc that loops out to the right of the node.
function LoopEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  markerEnd,
}: EdgeProps) {
  const bulge = 70
  const cx1 = sourceX + bulge
  const cy1 = sourceY - 10
  const cx2 = targetX + bulge
  const cy2 = targetY + 10
  const d = `M${sourceX},${sourceY} C${cx1},${cy1} ${cx2},${cy2} ${targetX},${targetY}`

  const midX = sourceX + bulge + 14
  const midY = (sourceY + targetY) / 2

  return (
    <>
      <path
        id={id}
        d={d}
        fill="none"
        style={{ stroke: 'var(--blue)' }}
        strokeWidth={1.5}
        strokeOpacity={0.8}
        markerEnd={markerEnd}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)`,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: 'var(--amber)',
              fontWeight: 500,
              background: 'color-mix(in srgb, var(--pane-bg) 90%, transparent)',
              padding: '2px 6px',
              borderRadius: 3,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
            className="nodrag nopan"
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const LoopEdge = memo(LoopEdgeComponent)
