헤더에 로그인 상태를 보여 주세요.

- API: `POST /api/session` `{ email: string; password: string }` → `{ userId: string; name: string }`, `DELETE /api/session` → 204
- 로그인하지 않았으면 헤더에 이메일·비밀번호 입력과 "로그인" 버튼을 보여 줘요.
- 로그인하면 헤더에 "{name}님"과 "로그아웃" 버튼을 보여 줘요. 로그아웃하면 처음 상태로 돌아가요.
- 로그인 정보는 앱 어디서나 읽을 수 있어야 해요.
- 실제 서버는 없어요. MSW handler로 응답을 만들어요.
- `src/app/app.tsx`에서 헤더를 보여 주세요(라우터는 넣지 않아요).
- 테스트는 하네스 기준(`.sonic-harness/harness.md` 7절의 필수 케이스)대로 써 주세요.
- 끝나면 `npm run lint`, `npm run typecheck`, `npm test`를 실행해서 통과시켜 주세요.
