API 키 삭제 확인 모달을 만들어 주세요.

- API: `GET /api/api-keys` → `{ id: string; name: string }[]`, `DELETE /api/api-keys/:id` → 204
- 화면: API 키 목록의 각 행에 "삭제" 버튼이 있어요. 누르면 확인 모달이 열려요.
- 모달은 여러 곳에서 다시 쓸 수 있게 `ConfirmDialog`(열기 버튼, 내용, 취소·확인 버튼)로 나눠 조합할 수 있게 만들어요. 열림 상태는 모달 안의 부품끼리 나눠 써요.
- 확인을 누르면 삭제하고 목록이 새로 고쳐져요. 취소하면 아무 일도 없어요.
- 실제 서버는 없어요. MSW handler로 응답을 만들어요.
- `src/app/app.tsx`에서 이 화면을 보여 주세요(라우터는 넣지 않아요).
- 테스트는 하네스 기준(`.sonic-harness/harness.md` 7절의 필수 케이스)대로 써 주세요.
- 끝나면 `npm run lint`, `npm run typecheck`, `npm test`를 실행해서 통과시켜 주세요.
