import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'

const sqlSyntaxTheme = {
  'code[class*="language-"]': {
    color: '#111827',
    background: 'transparent',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "Courier New", monospace',
    fontSize: '0.75rem',
    lineHeight: 1.55,
    textShadow: 'none',
    whiteSpace: 'pre'
  },
  'pre[class*="language-"]': {
    color: '#111827',
    background: '#f3f4f6',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "Courier New", monospace',
    fontSize: '0.75rem',
    lineHeight: 1.55,
    textShadow: 'none'
  },
  comment: {
    color: '#5b6472'
  },
  prolog: {
    color: '#5b6472'
  },
  doctype: {
    color: '#5b6472'
  },
  cdata: {
    color: '#5b6472'
  },
  punctuation: {
    color: '#374151'
  },
  property: {
    color: '#9f1239'
  },
  tag: {
    color: '#9f1239'
  },
  boolean: {
    color: '#92400e'
  },
  number: {
    color: '#92400e'
  },
  constant: {
    color: '#9f1239'
  },
  symbol: {
    color: '#9f1239'
  },
  deleted: {
    color: '#9f1239'
  },
  selector: {
    color: '#0f766e'
  },
  'attr-name': {
    color: '#0f766e'
  },
  string: {
    color: '#0f766e'
  },
  char: {
    color: '#0f766e'
  },
  builtin: {
    color: '#0f766e'
  },
  inserted: {
    color: '#0f766e'
  },
  operator: {
    color: '#374151'
  },
  entity: {
    color: '#374151'
  },
  url: {
    color: '#374151'
  },
  variable: {
    color: '#9a3412'
  },
  atrule: {
    color: '#5b21b6'
  },
  'attr-value': {
    color: '#0f766e'
  },
  keyword: {
    color: '#5b21b6',
    fontWeight: 650
  },
  function: {
    color: '#1d4ed8',
    fontWeight: 600
  },
  'class-name': {
    color: '#1d4ed8'
  },
  regex: {
    color: '#9a3412'
  },
  important: {
    color: '#9a3412',
    fontWeight: 650
  }
}

const LazySqlHighlighter = ({ children, customStyle }) => (
  <SyntaxHighlighter
    language="sql"
    style={sqlSyntaxTheme}
    customStyle={customStyle}
  >
    {children}
  </SyntaxHighlighter>
)

export default LazySqlHighlighter
