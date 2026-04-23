import { useTranslation } from 'react-i18next'
import type { IRNode } from '../types'

interface IRPanelProps {
  ir: IRNode[]
}

function renderNode(node: IRNode, depth = 0): string[] {
  const pad = '  '.repeat(depth)
  switch (node.kind) {
    case 'EX':
      return [`${pad}EX( ${node.actions || '—'} )`]
    case 'IF1': {
      const lines = [`${pad}IF1( ${node.condition} )`]
      lines.push(`${pad}  THEN:`)
      lines.push(`${pad}    EX( ${node.thenActions || '—'} )`)
      if (node.elseBranch.length > 0) {
        lines.push(`${pad}  ELSE:`)
        for (const b of node.elseBranch) lines.push(`${pad}    EX( ${b.actions || '—'} )`)
      }
      return lines
    }
    case 'IF3': {
      const lines = [`${pad}IF3`]
      node.branches.forEach((b, i) => {
        lines.push(`${pad}  ${i === 0 ? 'IF' : 'ELIF'} ( ${b.condition} ):`)
        lines.push(`${pad}    EX( ${b.actions || '—'} )`)
      })
      return lines
    }
    case 'DO2':
      return [`${pad}DO2( ${node.condition} )`, `${pad}  BODY: EX( ${node.body || '—'} )`]
    case 'DO3':
      return [`${pad}DO3( ${node.condition} )`, `${pad}  BODY: EX( ${node.body || '—'} )`]
    case 'RETURN':
      return [`${pad}RETURN`]
  }
}

export function IRPanel({ ir }: IRPanelProps) {
  const { t } = useTranslation()

  if (ir.length === 0) {
    return <div className="empty-sub">{t('empty.title')}</div>
  }

  const text = ir.flatMap((node) => renderNode(node)).join('\n')

  return (
    <div className="tab-scroll">
      <pre className="ir-panel">{text}</pre>
    </div>
  )
}
