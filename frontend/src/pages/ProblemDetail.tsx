import { useParams } from 'react-router-dom';
import { useProblem, useProblemTestCases } from '../hooks/useProblems';
import MonacoEditorComponent from '../components/editor/MonacoEditor';
import { useState } from 'react';


const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    data: problem,
    isPending: isProblemLoading,
    isError: isProblemError,
  } = useProblem(id ?? '');
  const {
    data: testCases,
    isPending: isTestCasesLoading,
    isError: isTestCasesError,
  } = useProblemTestCases(id ?? '');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<'python' | 'java' | 'cpp'>('python');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  if (isProblemLoading || isTestCasesLoading) {
    return <div className="text-center py-10">Loading problem...</div>;
  }
  if (isProblemError || isTestCasesError) {
    return <div className="text-center py-10 text-red-500">Error loading problem</div>;
  }
  if (!problem) {
    return <div className="text-center py-10">Problem not found</div>;
  }

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleSubmit = async () => {
    // TODO: Implement submission logic
    alert('Submission functionality not implemented yet');
  };

  const formatDifficulty = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with back link */}
      <div className="bg-white dark:bg-gray-800 shadow-md px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
            >
              ← Back to Problems
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex-1">
              {problem.title}
            </h1>
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${formatDifficulty(
                problem.difficulty
              )}`}>
                {problem.difficulty}
              </span>
              {/* Tags */}
              <div className="flex flex-wrap space-x-1">
                {(problem.tags || []).map((tag, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid gap-8 md:grid-cols-[1fr_300px]">
          {/* Problem Description */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Problem Statement</h2>
              <div className="prose dark:prose-invert max-none">
                {/* Using dangerouslySetInnerHTML for rich text description */}
                {/* In a real app, you might want to sanitize this or use markdown */}
                <div
                  dangerouslySetInnerHTML={{
                    __html: problem.description || '',
                  }}
                  className="mt-4"
                />
              </div>

              {/* Sample Test Cases */}
              {testCases && testCases.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold mt-6 mb-4">
                    Sample Test Cases
                  </h2>
                  <div className="space-y-4">
                    {testCases.map((tc, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">Test Case {index + 1}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Input / Output
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              Input:
                            </span>
                            <pre className="mt-1 text-sm bg-white dark:bg-gray-800 p-3 rounded overflow-x-auto">
                              {tc.input}
                            </pre>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              Expected Output:
                            </span>
                            <pre className="mt-1 text-sm bg-white dark:bg-gray-800 p-3 rounded overflow-x-auto">
                              {tc.expectedOutput}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Editor and Submit */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Code Editor</h2>
                <div className="flex items-center space-x-3">
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

              {/* Editor */}
              <div className="mb-4">
                <MonacoEditorComponent
                  language={language}
                  value={code}
                  onChange={handleCodeChange}
                  theme={theme}
                  height="400px"
                  minimapEnabled={true}
                  fontSize={14}
                  tabSize={2}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Submit Solution
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetail;