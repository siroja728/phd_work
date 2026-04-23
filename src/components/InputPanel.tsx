import { useState } from 'react'
import { EXAMPLES, type ExampleKey } from '../utils/examples'

interface InputPanelProps {
  onParse: (text: string) => void
}

const EXAMPLE_LABELS: Record<ExampleKey, string> = {
  sign: 'знак числа',
  minmax: 'мін/макс двох',
  grade: 'оцінка',
  expr: 'вираз A*(B+C/D)-E',
}

export function InputPanel({ onParse }: InputPanelProps) {
  const [text, setText] = useState(EXAMPLES.sign)

  function loadExample(key: ExampleKey) {
    setText(EXAMPLES[key])
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="dot dot-red" />
        <span className="dot dot-amber" />
        <span className="dot dot-green" />
        <span className="panel-title">input · опис програми</span>
      </div>
      <div className="panel-body">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'{ умова } [ дії ]\n{ умова } [ дії ]\n...'}
          spellCheck={false}
        />
        <div className="examples-label">приклади</div>
        <div className="examples">
          {(Object.keys(EXAMPLE_LABELS) as ExampleKey[]).map((key) => (
            <button key={key} className="ex-btn" onClick={() => loadExample(key)}>
              {EXAMPLE_LABELS[key]}
            </button>
          ))}
        </div>
        <button className="btn-parse" onClick={() => onParse(text)}>
          ▶ побудувати модель
        </button>
      </div>
    </div>
  )
}
