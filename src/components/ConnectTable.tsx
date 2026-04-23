import { useTranslation } from 'react-i18next'
import type { AutomatonTransition } from '../types'

interface ConnectTableProps {
  transitions: AutomatonTransition[]
}

export function ConnectTable({ transitions }: ConnectTableProps) {
  const { t } = useTranslation()

  if (transitions.length === 0) {
    return <div className="empty-sub">{t('empty.title')}</div>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>{t('table.connect.from')}</th>
          <th>{t('table.connect.condition')}</th>
          <th>{t('table.connect.to')}</th>
        </tr>
      </thead>
      <tbody>
        {transitions.map((tr, i) => (
          <tr key={i}>
            <td>{tr.from}</td>
            <td>
              <code className="condition-code">{tr.condition}</code>
            </td>
            <td>{tr.to}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
