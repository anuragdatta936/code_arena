import { Link } from 'react-router-dom';

// Define the Problem interface locally since it's not exported from api
interface Problem {
  id: number;
  title: string;
  difficulty: string;
  description?: string;
  tags?: string[];
  timeLimit?: number;
  memoryLimit?: number;
}

interface ProblemCardProps {
  problem: Problem;
}

const ProblemCard: React.FC<ProblemCardProps> = ({ problem }) => {
  // Format difficulty with color
  const getDifficultyClass = (difficulty: string) => {
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

  // Format tags
  const renderTags = (tags: string[]) => {
    return tags.map((tag, index) => (
      <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
        {tag}
      </span>
    ));
  };

  return (
    <Link to={`/problems/${problem.id}`} className="block hover:shadow-lg transition-shadow">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {problem.title}
            </h3>
            <div className="flex items-center space-x-3 mt-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyClass(
                problem.difficulty
              )}`}>
                {problem.difficulty}
              </span>
              {/* Tags */}
              <div className="flex flex-wrap space-x-1 mt-1">
                {renderTags(problem.tags || [])}
              </div>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300 line-clamp-3">
            {(problem.description?.substring(0, 150) ?? '')}{(problem.description?.length ?? 0) > 150 ? '...' : ''}
          </p>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>
                ⏱️ {problem.timeLimit}s
              </span>
              <span>
                💾 {problem.memoryLimit}MB
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProblemCard;