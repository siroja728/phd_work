import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParseResult, GeneratedCode } from '../types'
import { MainTable } from './MainTable'
import { ConnectTable } from './ConnectTable'
import { MemoTable } from './MemoTable'
import { StackTracePanel } from './StackTracePanel'
import { AutomatonDiagram } from './AutomatonDiagram'
import { CodeOutputPanel } from './CodeOutputPanel'

type TabId = 'main' | 'connect' | 'memo' | 'stack' | 'graph' | 'output'

const TAB_ICONS: Record<TabId, string> = {
  main: '⊞',
  connect: '⇄',
  memo: '⚙',
  stack: '≡',
  graph: '◎',
  output: '❯',
}

const TABS: TabId[] = ['main', 'connect', 'memo', 'stack', 'graph', 'output']

interface TabPanelProps {
  result: ParseResult | null
  generated: GeneratedCode | null
  isRunning: boolean
}

export function TabPanel({ result, generated, isRunning }: TabPanelProps) {
  const { t } = useTranslation()
  const [active, setActive] = useState<TabId>('output')

  const model = result?.model ?? { states: [], transitions: [], memo: [] }
  const exprs = result?.exprAnalysis ?? []

  function badge(id: TabId): string | null {
    if (!result) return null
    if (id === 'main') return String(model.states.length)
    if (id === 'connect') return String(model.transitions.length)
    if (id === 'memo') return model.memo.length > 0 ? String(model.memo.length) : null
    if (id === 'stack') return exprs.length > 0 ? String(exprs.length) : null
    return null
  }

  return (
    <div className="tabpanel-root">
      {/* Tab bar */}
      <div className="tab-bar" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            className={`tab-btn ${active === id ? 'tab-active' : ''}`}
            onClick={() => setActive(id)}
          >
            <span className="tab-icon">{TAB_ICONS[id]}</span>
            <span className="tab-label">{t(`tabs.${id}`)}</span>
            {badge(id) && <span className="tab-badge">{badge(id)}</span>}
          </button>
        ))}

        <div className="tab-bar-spacer" />

        {isRunning && (
          <div className="running-indicator">
            <span className="running-dot" />
            <span>{t('status.parsing')}</span>
          </div>
        )}
      </div>

      {/* Tab content — all panels are always mounted, hidden via CSS.
          This prevents remount on tab switch, so React Flow and other
          stateful components stay alive and receive prop updates. */}
      <div className="tab-content" role="tabpanel">
        {/* Empty state — shown only when no result and not running */}
        {!result && !isRunning && (
          <div className="tab-empty">
            <div className="empty-icon">{t('empty.icon')}</div>
            <div className="empty-title">{t('empty.title')}</div>
            <div className="empty-sub">
              {t('empty.hint')} <kbd>{t('empty.run')}</kbd>
            </div>
          </div>
        )}

        {/* All content panels — always mounted when result exists,
            visibility toggled with CSS display:none */}
        {result && (
          <>
            <div className="tab-scroll" style={{ display: active === 'main' ? 'block' : 'none' }}>
              <MainTable states={model.states} />
            </div>

            <div
              className="tab-scroll"
              style={{ display: active === 'connect' ? 'block' : 'none' }}
            >
              <ConnectTable transitions={model.transitions} />
            </div>

            <div className="tab-scroll" style={{ display: active === 'memo' ? 'block' : 'none' }}>
              <MemoTable memo={model.memo} />
            </div>

            <div className="tab-scroll" style={{ display: active === 'stack' ? 'block' : 'none' }}>
              <StackTracePanel analysis={exprs} />
            </div>

            {/* Graph tab — display:flex because ReactFlow needs flex container */}
            <div className="tab-graph" style={{ display: active === 'graph' ? 'flex' : 'none' }}>
              <AutomatonDiagram model={model} />
            </div>

            <div
              style={{
                display: active === 'output' ? 'flex' : 'none',
                height: '100%',
                flexDirection: 'column',
              }}
            >
              <CodeOutputPanel generated={generated} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
