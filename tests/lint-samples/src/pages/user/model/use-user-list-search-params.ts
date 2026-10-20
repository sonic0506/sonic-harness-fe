import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

export function useUserListSearchParams() {
  return useQueryStates({
    page: parseAsInteger.withDefault(1),
    q: parseAsString.withDefault(''),
  });
}
