import 'server-only';

// 서버 전용: 비밀 키가 필요한 요청은 여기에 둬요.
export const getUserSecretHeader = () => ({ Authorization: 'Bearer server' });
