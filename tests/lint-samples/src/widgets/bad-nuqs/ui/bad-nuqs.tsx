// expect: no-restricted-imports
import { useQueryState } from 'nuqs';

export function BadNuqs() {
  const [q] = useQueryState('q');
  return <p>{q}</p>;
}
