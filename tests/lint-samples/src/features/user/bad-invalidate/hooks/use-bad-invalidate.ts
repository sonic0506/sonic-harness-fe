// expect: @tanstack/query/prefer-query-options
import { useQueryClient } from '@tanstack/react-query';

export function useBadInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['user'] });
}
