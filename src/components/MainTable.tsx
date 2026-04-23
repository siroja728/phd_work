import { useTranslation } from 'react-i18next'
import type { AutomatonState, StateType } from '../types'

interface MainTableProps {
  states: AutomatonState[]
}

const TYPE_CLASS: Record<StateType, string> = {
  initial: 'badge-initial',
  final: 'badge-final',
  normal: 'badge-normal',
}

export function MainTable({ states }: MainTableProps) {
  const { t } = useTranslation()

  if (states.length === 0) {
    return <div className="empty-sub">{t('empty.title')}</div>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>{t('table.main.id')}</th>
          <th>{t('table.main.type')}</th>
          <th>{t('table.main.label')}</th>
          <th>{t('table.main.actions')}</th>
          <th>{t('table.main.mark')}</th>
        </tr>
      </thead>
      <tbody>
        {states.map((s) => (
          <tr key={s.id}>
            <td>{s.id}</td>
            <td>
              <span className={`type-badge ${TYPE_CLASS[s.type]}`}>
                {t(`state_type.${s.type}`)}
              </span>
            </td>
            <td>{s.label ? `:${s.label}` : '—'}</td>
            <td>{s.actions || '—'}</td>
            <td className={s.mark ? 'mark-true' : 'mark-false'}>{String(s.mark)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
