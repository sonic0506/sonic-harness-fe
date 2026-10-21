import { z } from 'zod';

// 환경 변수는 여기서만 읽어요(sonic/no-direct-env). 값을 추가하면 스키마에도 넣어요.
// Next는 process.env.NEXT_PUBLIC_*를 글자 그대로 써야 브라우저 번들에 넣어 줘서, 하나씩 적어요.
// 비밀 값은 여기 두지 않고 src/shared/server/env.server.ts(import 'server-only')에 둬요.
const schema = z.object({
  // 서버 컴포넌트의 prefetch가 쓰는 절대 주소예요. 비밀 값이 아니라 여기에 둬요.
  API_ORIGIN: z.url().default('http://localhost:3000'),
});

export const env = schema.parse({ API_ORIGIN: process.env.API_ORIGIN });
