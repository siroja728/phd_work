import { useTranslation } from 'react-i18next'
import type { MemoEntry } from '../types'

interface MemoTableProps {
  memo: MemoEntry[]
}

export function MemoTable({ memo }: MemoTableProps) {
  const { t } = useTranslation()

  if (memo.length === 0) {
    return <div className="empty-sub">{t('empty.title')}</div>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>{t('table.memo.state')}</th>
          <th>{t('table.memo.sem')}</th>
          <th>{t('table.memo.resource')}</th>
        </tr>
      </thead>
      <tbody>
        {memo.map((e, i) => (
          <tr key={i}>
            <td>{e.stateId}</td>
            <td><code className="condition-code">{e.sem}</code></td>
            <td><code className="condition-code">{e.resource}</code></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
