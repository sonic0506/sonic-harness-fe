// expect: sonic/store-selector
import { useSessionStore } from '@/entities/session';

export function BadStore() {
  const { session } = useSessionStore();
  return <p>{session?.name}</p>;
}
