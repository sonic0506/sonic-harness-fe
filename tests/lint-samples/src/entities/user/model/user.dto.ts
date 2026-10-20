export interface UserDto {
  id: string;
  name: string;
  isActive: boolean;
}
export type GetUsersParams = { page: number };
