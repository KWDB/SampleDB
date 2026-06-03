import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

const editorExtensions = [
  sql(),
  EditorView.lineWrapping,
  EditorView.theme({
    '&': {
      fontSize: '13px'
    },
    '.cm-content': {
      padding: '12px',
      minHeight: '220px',
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "Courier New", monospace',
      wordBreak: 'break-word'
    },
    '.cm-focused': {
      outline: 'none'
    },
    '.cm-editor': {
      borderRadius: '8px'
    },
    '.cm-line': {
      wordWrap: 'break-word'
    }
  })
]

const LazySqlEditor = ({ value, onChange, editorTheme, placeholder }) => (
  <CodeMirror
    value={value}
    onChange={onChange}
    extensions={editorExtensions}
    theme={editorTheme === 'dark' ? oneDark : 'light'}
    placeholder={placeholder}
    basicSetup={{
      lineNumbers: true,
      foldGutter: true,
      dropCursor: false,
      allowMultipleSelections: false,
      indentOnInput: true,
      bracketMatching: true,
      closeBrackets: true,
      autocompletion: true,
      highlightSelectionMatches: false,
      searchKeymap: true,
      tabSize: 2
    }}
  />
)

export default LazySqlEditor
