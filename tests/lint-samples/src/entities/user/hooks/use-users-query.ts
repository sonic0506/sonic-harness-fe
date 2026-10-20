import { useSuspenseQuery } from '@tanstack/react-query';
import { getUsers } from '../api/user.api';

export const userQueryKeys = {
  all: ['user'] as const,
  list: (page: number) => [...userQueryKeys.all, 'list', page] as const,
};

export function useUsersQuery(page: number) {
  return useSuspenseQuery({
    queryKey: userQueryKeys.list(page),
    queryFn: () => getUsers({ page }),
  });
}
