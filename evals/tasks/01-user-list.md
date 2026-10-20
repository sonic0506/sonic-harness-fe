사용자 목록 화면을 만들어 주세요.

- API: `GET /api/users` → `{ id: string; name: string; email: string; isActive: boolean }[]`
- 화면: 이름, 이메일, 활성 여부를 목록으로 보여 줘요. 사용자가 없으면 "사용자가 없어요."를 보여 줘요.
- 실제 서버는 없어요. MSW handler로 응답을 만들어요.
- `src/app/app.tsx`에서 이 화면을 보여 주세요(라우터는 넣지 않아요).
- 정상, 빈 목록, 서버 에러 세 경우의 테스트를 써 주세요.
- 끝나면 `npm run lint`, `npm run typecheck`, `npm test`를 실행해서 통과시켜 주세요.
