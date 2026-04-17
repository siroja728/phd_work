import { useState, useRef, useCallback, useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { Editor } from './components/Editor'
import { TabPanel } from './components/TabPanel'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { parsePredicates } from './services/predicateParser'
import { generateCpp } from './services/codeGenerator'
import { EXAMPLES } from './utils/examples'
import type { ParseResult, GeneratedCode } from './types'

export default function App() {
  const { t } = useTranslation()
  const [text, setText] = useState(EXAMPLES.sign)
  const [result, setResult] = useState<ParseResult | null>(null)
  const [generated, setGenerated] = useState<GeneratedCode | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [splitPct, setSplitPct] = useState(38)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  function handleRun() {
    setIsRunning(true)
    setTimeout(() => {
      const parsed = parsePredicates(text)
      const code = generateCpp(parsed.model)
      setResult(parsed)
      setGenerated(code)
      setIsRunning(false)
    }, 40)
  }

  const onMouseDown = useCallback(() => { dragging.current = true }, [])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setSplitPct(Math.min(70, Math.max(20, pct)))
    }
    function onUp() { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const statusText = result
    ? t('status.model', {
        states: result.model.states.length,
        transitions: result.model.transitions.length,
      })
    : t('status.no_model')

  return (
    <div className="ide-root">
      {/* Title bar */}
      <div className="ide-titlebar">
        <div className="titlebar-left">
          <span className="app-logo">◈</span>
          <span className="app-name">{t('app.name')}</span>
          <span className="app-version">v0.3</span>
        </div>
        <div className="titlebar-center">
          <span className="titlebar-file">{t('app.file')}</span>
        </div>
        <div className="titlebar-right">
          <span className="titlebar-link">{t('app.subtitle')}</span>
          <div className="titlebar-divider" />
          <LanguageSwitcher />
        </div>
      </div>

      {/* Main split */}
      <div className="ide-workspace" ref={containerRef}>
        <div className="ide-editor-pane" style={{ width: `${splitPct}%` }}>
          <Editor value={text} onChange={setText} onRun={handleRun} />
        </div>

        <div className="ide-resizer" onMouseDown={onMouseDown}>
          <div className="resizer-handle" />
        </div>

        <div className="ide-output-pane" style={{ width: `${100 - splitPct}%` }}>
          <ReactFlowProvider>
          <TabPanel result={result} generated={generated} isRunning={isRunning} />
        </ReactFlowProvider>
        </div>
      </div>

      {/* Status bar */}
      <div className="ide-statusbar">
        <span className="status-item">
          <span className="status-dot status-dot-ok" />
          {t('status.ready')}
        </span>
        <span className="status-sep" />
        <span className="status-item">{statusText}</span>
        <div className="status-spacer" />
        <span className="status-item">ЧДТУ · Ємелянов С.А.</span>
      </div>
    </div>
  )
}
