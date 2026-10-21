import { Suspense } from 'react';

import { useSessionStore } from '@/entities/session';
import { UserListSection } from '@/widgets/user-list';

import { useUserListSearchParams } from './model/use-user-list-search-params';

export function UserListPage() {
  const [{ page }] = useUserListSearchParams();
  const session = useSessionStore((s) => s.session);
  const handleUserSelect = (id: string) => console.info(id, page);
  return (
    <Suspense fallback={<p>불러오는 중</p>}>
      {session && <p>{session.name}님</p>}
      <UserListSection onSelect={handleUserSelect} />
    </Suspense>
  );
}
