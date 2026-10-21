// expect: no-restricted-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
import { useSearchParams } from 'next/navigation';

export function BadUrlPage() {
  const params = useSearchParams();
  return <p>{params.get('page')}</p>;
}
