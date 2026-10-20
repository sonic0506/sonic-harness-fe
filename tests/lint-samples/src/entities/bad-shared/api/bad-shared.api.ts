// expect: boundaries/dependencies
import { http } from '@/shared/api/http';

export const getBad = () => http<number>('/bad');
