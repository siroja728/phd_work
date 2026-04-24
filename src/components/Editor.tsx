import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { EXAMPLES } from '../utils/examples'

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

  function syncScroll() {
    if (linesRef.current && textareaRef.current) {
      linesRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onRun()
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
          </select>
          <button className="run-btn" onClick={onRun} title="Ctrl+Enter">
            <span className="run-icon">▶</span>
            <span>{t('editor.run')}</span>
            <kbd>⌃↵</kbd>
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="line-numbers" ref={linesRef} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="line-number">
              {i + 1}
            </div>
          ))}
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
