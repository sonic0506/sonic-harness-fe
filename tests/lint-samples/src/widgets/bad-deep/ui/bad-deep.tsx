// expect: boundaries/dependencies
import { UserRow } from '@/entities/user/ui/user-row';

export function BadDeep() {
  return <UserRow user={{ id: '1', name: 'a', isActive: true }} onSelect={() => {}} />;
}
