import MonacoEditor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';

// Language to Monaco language mapping
const languageMap: Record<string, string> = {
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  javascript: 'javascript',
  typescript: 'typescript',
};

interface MonacoEditorProps {
  /** Programming language ("python", "java", "cpp") */
  language: string;
  /** Initial code value */
  value: string;
  /** Callback when code changes */
  onChange?: (value: string) => void;
  /** Editor theme ("light" or "dark") */
  theme?: 'light' | 'dark';
  /** Editor height */
  height?: string | number;
  /** Editor width */
  width?: string | number;
  /** Whether to enable minimap */
  minimapEnabled?: boolean;
  /** Font size */
  fontSize?: number;
  /** Tab size */
  tabSize?: number;
  /** Whether to enable word wrap */
  wrapEnabled?: boolean;
  /** Initial cursor position */
  readonly?: boolean;
}

const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({
  language = 'python',
  value = '',
  onChange,
  theme = 'dark',
  height = '100%',
  width = '100%',
  minimapEnabled = true,
  fontSize = 14,
  tabSize = 2,
  wrapEnabled = false,
  readonly = false,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [mounted, setMounted] = useState(false);

  // Set mounted to true when component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load worker for the language when needed
  useEffect(() => {
    if (!mounted) return;

    // Configure Monaco editor environment
    (window as any).MonacoEnvironment = {
      getWorkerURL: function (_moduleId: any, label: any) {
        if (label === 'python') {
          return './python.worker.js';
        }
        if (label === 'java' || label === 'cpp') {
          return './cpp.worker.js';
        }
        return './editor.worker.js';
      },
    };
  }, [mounted]);

  // Handle code changes
  const handleChange = (value: string | undefined) => {
    if (value !== undefined && onChange) {
      onChange(value);
    }
  };

  // Editor options
  const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    language: languageMap[language] || 'plaintext',
    theme,
    minimap: { enabled: minimapEnabled },
    fontSize,
    tabSize,
    wordWrap: wrapEnabled ? 'on' : 'off',
    readOnly: readonly,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    // Enable useful editing features
    quickSuggestions: { other: true, comments: true, strings: true },
    parameterHints: {
      enabled: true
    },
    suggestOnTriggerCharacters: true,
    // Code lens and code actions
    codeLens: true,
    // Matching brackets
    matchBrackets: 'always',
    // Format on paste/ type
    // formatOnPaste: true,
    // formatOnType: true,
  };

  if (!mounted) {
    return <div data-testid="monaco-editor-placeholder" style={{ width, height }} />;
  }

  return (
    <MonacoEditor
      onMount={(editor) => {
        editorRef.current = editor;
      }}
      height={height}
      width={width}
      defaultLanguage={languageMap[language] || 'plaintext'}
      value={value}
      onChange={handleChange}
      options={editorOptions}
      theme={theme as any}
      // Enable editor services
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    /> // Passing unknown props to MonacoEditor
  );
};

export default MonacoEditorComponent;