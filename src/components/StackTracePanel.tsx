import { useTranslation } from 'react-i18next'
import type { ExpressionAnalysis } from '../types'

interface StackTracePanelProps {
  analysis: ExpressionAnalysis[]
}

export function StackTracePanel({ analysis }: StackTracePanelProps) {
  const { t } = useTranslation()

  if (analysis.length === 0) {
    return <div className="empty-sub">{t('stack.no_expr')}</div>
  }

  return (
    <div>
      {analysis.map((ea, ei) => (
        <div key={ei} className="expr-block">
          <div className="expr-header">
            <span>
              {t('stack.expr_label')}:{' '}
              <span className="expr-text">{ea.expr}</span>
            </span>
            <span className="expr-meta">
              {t('stack.temp_label')}:{' '}
              <span className="expr-temp">{ea.tempCount}</span>
            </span>
          </div>

          <div className="expr-columns">
            <div>
              <div className="col-label">{t('stack.steps_title')}</div>
              <div className="table-scroll">
                <table className="data-table trace-table">
                  <thead>
                    <tr>
                      <th>{t('stack.col_step')}</th>
                      <th>{t('stack.col_pair')}</th>
                      <th>{t('stack.col_action')}</th>
                      <th>{t('stack.col_action_stack')}</th>
                      <th>{t('stack.col_operand_stack')}</th>
                      <th>{t('stack.col_code')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ea.steps.map(s => (
                      <tr key={s.step}>
                        <td className="cell-muted">{s.step}</td>
                        <td className="cell-data">{s.pair}</td>
                        <td className="cell-action">{s.action}</td>
                        <td className="cell-stack">{s.actionStack}</td>
                        <td className="cell-operand">{s.dataStack}</td>
                        <td className={s.code !== '—' ? 'cell-code' : 'cell-muted'}>
                          {s.code}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="col-label">{t('stack.code_title')}</div>
              <div className="code-box">
                {ea.intermediateCode.map((line, li) => {
                  const eqIdx = line.indexOf('=')
                  const lhs = line.slice(0, eqIdx).trim()
                  const rhs = line.slice(eqIdx + 1).trim()
                  return (
                    <div key={li} className="icode-line">
                      <span className="icode-lhs">{lhs}</span>
                      <span className="icode-eq"> = </span>
                      <span className="icode-rhs">{rhs}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
