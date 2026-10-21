// expect: @tanstack/query/prefer-query-options
import { useSuspenseQuery } from '@tanstack/react-query';

export const useBadKeyQuery = () =>
  useSuspenseQuery({ queryKey: ['bad-key'], queryFn: () => 1 });
