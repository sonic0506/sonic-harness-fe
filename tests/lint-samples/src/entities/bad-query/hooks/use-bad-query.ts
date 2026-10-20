// expect: no-restricted-imports
import { useQuery } from '@tanstack/react-query';

export const useBadQuery = () => useQuery({ queryKey: ['bad'], queryFn: () => 1 });
