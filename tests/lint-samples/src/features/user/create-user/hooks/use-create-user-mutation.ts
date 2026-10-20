import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userQueries } from '@/entities/user';
import { createUser } from '../api/create-user.api';

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: userQueries.all() }),
  });
}
