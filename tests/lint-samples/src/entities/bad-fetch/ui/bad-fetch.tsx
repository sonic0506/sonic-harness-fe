// expect: no-restricted-globals
export function BadFetch() {
  const handleClick = () => void fetch('/api/users');
  return <button onClick={handleClick}>불러오기</button>;
}
