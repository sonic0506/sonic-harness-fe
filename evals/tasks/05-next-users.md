Next.js 프로젝트에 두 화면을 만들어 주세요.

- `/notice` 공지 목록: 공지 데이터는 저장소 안 파일(공지 도메인의 model에 둔 상수)이에요. `{ id: string; title: string; date: string }[]`. 하루에 한 번만 다시 그려도 돼요.
- `/users` 사용자 목록: API `GET /api/users?page=1&q=kim` → `{ id: string; name: string; email: string }[]`. 검색어와 페이지는 URL에 남아요. 첫 화면은 서버에서 데이터를 미리 불러와 보여 주고, 검색어를 바꾸면 브라우저에서 다시 불러와요.
- 실제 서버는 없어요. 브라우저와 테스트용 MSW handler를 만들어요.
- 테스트는 하네스 기준(`.sonic-harness/harness.md` 7절의 필수 케이스)대로 써 주세요.
- 끝나면 `npm run lint`, `npm run typecheck`, `npm test`, `npx next build`를 실행해서 통과시켜 주세요.
