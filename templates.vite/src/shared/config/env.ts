import { z } from 'zod';

// 환경 변수는 여기서만 읽어요(sonic/no-direct-env). 값을 추가하면 스키마에도 넣어요.
// 브라우저에 보이는 값이라 VITE_로 시작하고, 비밀 값은 넣지 않아요.
const schema = z.object({
  DEV: z.boolean(), // Vite가 넣어 주는 값(개발 서버면 true)
  VITE_API_BASE_URL: z.string().default('/api'),
});

export const env = schema.parse(import.meta.env);
