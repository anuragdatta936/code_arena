import { useQueries, useQuery } from '@tanstack/react-query';
import { problemsApi } from '../services/api';

// Define the response types based on our API
interface ProblemResponse {
  id: number;
  title: string;
  difficulty: string;
  description?: string;
  tags?: string[];
  // Add other fields as needed
}

interface ProblemsApiResponse {
  data: ProblemResponse[];
  total: number;
  // Add pagination fields if needed
}

export const useProblems = (options: {
  page?: number;
  limit?: number;
  tags?: string;
  difficulty?: string
} = {}) => {
  return useQuery<ProblemsApiResponse, Error>({
    queryKey: ['problems', options],
    queryFn: () => problemsApi.getAll(options).then(res => res.data),
  });
};

export const useProblem = (id: string) => {
  return useQuery<ProblemResponse, Error>({
    queryKey: ['problem', id],
    queryFn: () => problemsApi.getById(id).then(res => res.data),
    enabled: !!id,
  });
};

export const useProblemTestCases = (id: string) => {
  // Define test case response type
  interface TestCase {
    input: string;
    expectedOutput: string;
  }

  return useQuery<TestCase[], Error>({
    queryKey: ['problem-testcases', id],
    queryFn: () => problemsApi.getTestCases(id).then(res => res.data),
    enabled: !!id,
  });
};

// For fetching multiple problems by IDs (useful for problem cards in lists)
export const useProblemsByIds = (ids: string[]) => {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['problem', id],
      queryFn: () => problemsApi.getById(id).then(res => res.data),
      enabled: !!id,
    })),
  });
};