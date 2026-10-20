import { http } from '@/shared/api';
import type { GetUsersParams, UserDto } from '../model/user.dto';

export const getUsers = (params: GetUsersParams) =>
  http<UserDto[]>(`/users?page=${params.page}`);
