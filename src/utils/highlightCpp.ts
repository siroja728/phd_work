import { escapeHtml } from './escapeHtml'

const KEYWORDS = [
  '#include',
  'using',
  'namespace',
  'std',
  'int',
  'bool',
  'string',
  'float',
  'double',
  'return',
  'while',
  'switch',
  'case',
  'break',
  'if',
  'for',
  'true',
  'false',
]

const FUNCTIONS = ['cin', 'cout', 'endl', 'main']

export function highlightCpp(code: string): string {
  let h = escapeHtml(code)

  // strings
  h = h.replace(/&quot;([^&]*)&quot;/g, '<span class="hl-str">"$1"</span>')

  // comments
  h = h.replace(/(\/\/[^\n]*)/g, '<span class="hl-cm">$1</span>')

  // numbers
  h = h.replace(/\b(\d+)\b/g, '<span class="hl-num">$1</span>')

  // keywords
  for (const kw of KEYWORDS) {
    h = h.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="hl-kw">$1</span>')
  }

  // functions / identifiers
  for (const fn of FUNCTIONS) {
    h = h.replace(new RegExp(`\\b(${fn})\\b`, 'g'), '<span class="hl-fn">$1</span>')
  }

  // logical operators
  h = h.replace(/(&amp;&amp;|\|\|)/g, '<span class="hl-op">$1</span>')

  return h
}
