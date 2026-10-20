// expect: no-restricted-imports
import { useUsersQuery } from '../hooks/use-users-query';

export function BadPropsOnly() {
  const { data } = useUsersQuery(1);
  return <p>{data.length}</p>;
}
