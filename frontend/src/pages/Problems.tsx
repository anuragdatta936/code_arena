import { useProblems } from '../hooks/useProblems';
import ProblemCard from '../components/problem/ProblemCard';
import { useState } from 'react';

const Problems: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [tagsFilter, setTagsFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  const {
    data: problemsData,
    isLoading,
    isError,
  } = useProblems({
    page,
    limit,
    tags: tagsFilter || undefined,
    difficulty: difficultyFilter || undefined,
  });

  if (isLoading) return <div className="text-center py-10">Loading problems...</div>;
  if (isError) return <div className="text-center py-10 text-red-500">Error loading problems</div>;

  const problems = problemsData?.data || [];
  const total = problemsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-md px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Problem Set
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {total} problems available
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-md px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={tagsFilter}
                onChange={(e) => {
                  setTagsFilter(e.target.value);
                  setPage(1); // Reset page when filter changes
                }}
                placeholder="e.g., array, string, dp"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Difficulty
              </label>
              <select
                value={difficultyFilter}
                onChange={(e) => {
                  setDifficultyFilter(e.target.value);
                  setPage(1); // Reset page when filter changes
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">All difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Problems per page
              </label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1); // Reset page when limit changes
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setTagsFilter('');
                  setDifficultyFilter('');
                  setPage(1);
                  setLimit(10);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Problems Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="bg-white dark:bg-gray-800 shadow-md px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Showing {Math.min(problems.length, total)} of {total} problems
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Problems;