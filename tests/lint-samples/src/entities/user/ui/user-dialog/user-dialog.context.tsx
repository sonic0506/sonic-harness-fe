import { createContext, useContext } from 'react';

type UserDialogState = { isOpen: boolean; close: () => void };

export const UserDialogContext = createContext<UserDialogState | null>(null);

export function useUserDialog() {
  const state = useContext(UserDialogContext);
  if (!state) throw new Error('UserDialog 안에서만 써요.');
  return state;
}
