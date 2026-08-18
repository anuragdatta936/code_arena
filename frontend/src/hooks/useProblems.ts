import { useQueries, useQuery } from '@tanstack/react-query';
import { problemsApi } from '../services/api';

export const useProblems = (options: {
  page?: number;
  limit?: number;
  tags?: string;
  difficulty?: string
} = {}) => {
  return useQuery({
    queryKey: ['problems', options],
    queryFn: () => problemsApi.getAll(options),
    keepPreviousData: true,
  });
};

export const useProblem = (id: string) => {
  return useQuery({
    queryKey: ['problem', id],
    queryFn: () => problemsApi.getById(id),
    enabled: !!id,
  });
};

export const useProblemTestCases = (id: string) => {
  return useQuery({
    queryKey: ['problem-testcases', id],
    queryFn: () => problemsApi.getTestCases(id),
    enabled: !!id,
  });
};

// For fetching multiple problems by IDs (useful for problem cards in lists)
export const useProblemsByIds = (ids: string[]) => {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['problem', id],
      queryFn: () => problemsApi.getById(id),
      enabled: !!id,
    })),
  });
};