// expect: no-restricted-imports
import { useSearchParams } from 'next/navigation';

export function BadUrlPage() {
  const params = useSearchParams();
  return <p>{params.get('page')}</p>;
}
