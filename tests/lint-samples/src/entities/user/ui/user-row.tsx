import type { UserDto } from '../model/user.dto';

type UserRowProps = { user: UserDto; onSelect: (id: string) => void };

export function UserRow({ user, onSelect }: UserRowProps) {
  const isInactive = !user.isActive;
  return (
    <li>
      <button onClick={() => onSelect(user.id)}>{user.name}</button>
      {isInactive && <span>비활성</span>}
    </li>
  );
}
