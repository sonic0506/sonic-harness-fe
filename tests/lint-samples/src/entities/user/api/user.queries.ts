import { queryOptions } from '@tanstack/react-query';

import type { GetUsersParams } from '../model/user.dto';
import { getUsers } from './user.api';

export const userQueries = {
  all: () => ['user'] as const,
  list: (params: GetUsersParams) =>
    queryOptions({
      queryKey: [...userQueries.all(), 'list', params],
      queryFn: () => getUsers(params),
    }),
};
