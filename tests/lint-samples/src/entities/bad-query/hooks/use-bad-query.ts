// expect: no-restricted-imports, @tanstack/query/prefer-query-options
import { useQuery } from '@tanstack/react-query';

export const useBadQuery = () =>
  useQuery({ queryKey: ['bad'], queryFn: () => 1 });
