// expect: no-restricted-imports
import { create } from 'zustand';

export const useBadStore = create(() => ({ count: 0 }));
