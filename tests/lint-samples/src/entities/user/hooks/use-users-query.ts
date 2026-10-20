import { useSuspenseQuery } from '@tanstack/react-query';
import { userQueries } from '../api/user.queries';

export function useUsersQuery(page: number) {
  return useSuspenseQuery(userQueries.list({ page }));
}
