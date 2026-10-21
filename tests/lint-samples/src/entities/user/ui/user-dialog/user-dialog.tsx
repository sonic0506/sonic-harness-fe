import { type ReactNode, useState } from 'react';

import { UserDialogContext, useUserDialog } from './user-dialog.context';

function UserDialogClose() {
  const { close } = useUserDialog();
  return <button onClick={close}>닫기</button>;
}

export function UserDialog({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const close = () => setIsOpen(false);
  if (!isOpen) return null;
  return (
    <UserDialogContext.Provider value={{ isOpen, close }}>
      <div role="dialog">
        {children}
        <UserDialogClose />
      </div>
    </UserDialogContext.Provider>
  );
}
