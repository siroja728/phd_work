import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GeneratedCode } from '../types'
import { highlightCpp } from '../utils/highlightCpp'

interface CodeOutputPanelProps {
  generated: GeneratedCode | null
}

export function CodeOutputPanel({ generated }: CodeOutputPanelProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!generated) return
    await navigator.clipboard.writeText(generated.source)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="code-panel">
      <div className="code-header">
        <span className="code-lang-badge">C++</span>
        <div className="code-header-spacer" />
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? t('code.copied') : t('code.copy')}
        </button>
      </div>
      <div className="code-body">
        {generated ? (
          <pre
            className="code-pre"
            dangerouslySetInnerHTML={{ __html: highlightCpp(generated.source) }}
          />
        ) : (
          <pre className="code-pre" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {t('code.placeholder')}
          </pre>
        )}
      </div>
    </div>
  )
}
