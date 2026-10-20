import { UserRow, useUsersQuery } from '@/entities/user';
import { CreateUserButton } from '@/features/user/create-user';

export function UserListSection({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { data: users } = useUsersQuery(1);
  if (users.length === 0) return <p>사용자가 없어요.</p>;
  return (
    <section>
      <CreateUserButton />
      <ul>
        {users.map((user) => (
          <UserRow key={user.id} user={user} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  );
}
