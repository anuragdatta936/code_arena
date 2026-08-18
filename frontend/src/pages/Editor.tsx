import { useState } from 'react';
import MonacoEditorComponent from '../components/editor/MonacoEditor';

const Editor: React.FC = () => {
  const [code, setCode] = useState(`// Welcome to CodeArena!
// Write your code here

def hello_world():
    print("Hello, World!"))

hello_world()
`);
  const [language, setLanguage] = useState<'python' | 'java' | 'cpp'>('python');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Code Editor
          </h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-300">Language:</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="border rounded px-2 py-1"
              >
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-300">Theme:</span>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="border rounded px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar - could contain file explorer, etc. */}
          <aside className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">File Explorer</h2>
            <div className="space-y-2">
              <div className="flex items-center px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="material-icons">folder</span>
                <span className="ml-2">main.py</span>
              </div>
            </div>
          </aside>

          {/* Editor */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-xl font-semibold">Editor</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    // Format code (placeholder)
                    alert('Format code functionality would go here');
                  }}
                  className="btn-icon hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className="material-icons">format_indent_increase</span>
                </button>
                <button
                  onClick={() => {
                    // Run code (placeholder)
                    alert('Run code functionality would go here');
                  }}
                  className="btn-primary px-4 py-2"
                >
                  Run Code
                </button>
              </div>
            </div>
            <div className="p-4">
              <MonacoEditorComponent
                language={language}
                value={code}
                onChange={handleCodeChange}
                theme={theme}
                height="600px"
                minimapEnabled={true}
                fontSize={14}
                tabSize={2}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Editor;