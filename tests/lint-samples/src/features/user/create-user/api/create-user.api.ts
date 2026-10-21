import type { UserDto } from '@/entities/user';
import { http } from '@/shared/api';

export type CreateUser = { name: string };
export const createUser = (body: CreateUser) =>
  http<UserDto>('/users', { method: 'POST', body: JSON.stringify(body) });
