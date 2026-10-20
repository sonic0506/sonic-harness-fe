import { Suspense } from 'react';
import { UserListSection } from '@/widgets/user-list';

export function UserListPage() {
  const handleUserSelect = (id: string) => console.info(id);
  return (
    <Suspense fallback={<p>불러오는 중</p>}>
      <UserListSection onSelect={handleUserSelect} />
    </Suspense>
  );
}
