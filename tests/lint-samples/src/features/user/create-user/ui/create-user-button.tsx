import { useCreateUserMutation } from '../hooks/use-create-user-mutation';

export function CreateUserButton() {
  const { mutate, isPending } = useCreateUserMutation();
  const handleClick = () => mutate({ name: '새 사용자' });
  return (
    <button disabled={isPending} onClick={handleClick}>
      사용자 만들기
    </button>
  );
}
