import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { EXAMPLES } from '../utils/examples'
import { formatPredicates } from '../utils/formatPredicates'
import { validatePredicates, type Diagnostic } from '../utils/validatePredicates'

interface EditorProps {
  value: string
  onChange: (v: string) => void
  onRun: () => void
}

export function Editor({ value, onChange, onRun }: EditorProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const linesRef = useRef<HTMLDivElement>(null)
  const lineCount = value.split('\n').length

  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  useEffect(() => {
    const id = setTimeout(() => setDiagnostics(validatePredicates(value)), 400)
    return () => clearTimeout(id)
  }, [value])

  const errorByLine = new Map<number, Diagnostic[]>()
  for (const d of diagnostics) {
    if (!errorByLine.has(d.line)) errorByLine.set(d.line, [])
    errorByLine.get(d.line)!.push(d)
  }

  function syncScroll() {
    if (linesRef.current && textareaRef.current) {
      linesRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  function handleFormat() {
    onChange(formatPredicates(value))
  }

  function handleRun() {
    // Validate synchronously so keyboard shortcut can't bypass debounced state
    const errs = validatePredicates(value)
    if (errs.length > 0) {
      setDiagnostics(errs)
      return
    }
    onRun()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRun()
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault()
      handleFormat()
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const el = textareaRef.current!
      const start = el.selectionStart
      const end = el.selectionEnd
      const newVal = value.slice(0, start) + '  ' + value.slice(end)
      onChange(newVal)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2
      })
    }
  }

  const linesLabel =
    lineCount === 1
      ? t('editor.lines_one', { count: lineCount })
      : lineCount < 5
        ? t('editor.lines_few', { count: lineCount })
        : t('editor.lines_many', { count: lineCount })

  return (
    <div className="editor-root">
      <div className="editor-toolbar">
        <div className="editor-breadcrumb">
          <span className="breadcrumb-icon">◈</span>
          <span className="breadcrumb-text">{t('app.file')}</span>
        </div>
        <div className="editor-actions">
          <select
            className="example-select"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) onChange(EXAMPLES[e.target.value])
              e.target.value = ''
            }}
          >
            <option value="" disabled>
              {t('editor.examples')}
            </option>
            <option value="sign">{t('examples.sign')}</option>
            <option value="ifelse">{t('examples.ifelse')}</option>
            <option value="while">{t('examples.while')}</option>
            <option value="dowhile">{t('examples.dowhile')}</option>
            <option value="expr">{t('examples.expr')}</option>
            <option value="memo">{t('examples.memo')}</option>
            <option value="parallel">{t('examples.parallel')}</option>
          </select>
          <button className="fmt-btn" onClick={handleFormat} title="Ctrl+F">
            <span>{t('editor.format')}</span>
            <kbd>⌃F</kbd>
          </button>
          <button
            className={`run-btn${diagnostics.length > 0 ? ' run-btn--blocked' : ''}`}
            onClick={handleRun}
            title={diagnostics.length > 0 ? 'Fix errors before running' : 'Ctrl+Enter'}
          >
            <span className="run-icon">{diagnostics.length > 0 ? '✕' : '▶'}</span>
            <span>{t('editor.run')}</span>
            <kbd>⌃↵</kbd>
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="line-numbers" ref={linesRef} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => {
            const errs = errorByLine.get(i + 1)
            return (
              <div
                key={i}
                className={`line-number${errs ? ' line-number--error' : ''}`}
                title={errs ? errs.map((e) => e.message).join('\n') : undefined}
              >
                {errs ? '!' : i + 1}
              </div>
            )
          })}
        </div>
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder={t('editor.placeholder')}
        />
      </div>

      {diagnostics.length > 0 && (
        <div className="editor-diagnostics">
          {diagnostics.map((d, i) => (
            <div key={i} className="diag-row">
              <span className="diag-loc">L{d.line}</span>
              <span className="diag-msg">{d.message}</span>
              <span className="diag-hint">{d.hint}</span>
            </div>
          ))}
        </div>
      )}

      <div className="editor-statusbar">
        <span>{linesLabel}</span>
        <span className="statusbar-sep" />
        <span>{t('editor.language')}</span>
        <span className="statusbar-sep" />
        <span>{t('editor.encoding')}</span>
      </div>
    </div>
  )
}
