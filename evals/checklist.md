# 기준 작업 체크리스트

`evals/run.sh`가 [자동] 항목을 채우고, [수동] 항목은 결과 파일에서 사람이 체크해요.
규칙(`.claude/harness.md`)을 바꾸면 이 표도 함께 고쳐요.

## 공통

| #   | 항목                                                                                                                                                  | 확인                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | `npm run lint` 통과                                                                                                                                   | [자동]                     |
| 2   | `npm run typecheck` 통과                                                                                                                              | [자동]                     |
| 3   | `npm test` 통과, 테스트 파일이 있음                                                                                                                   | [자동]                     |
| 4   | `eslint-disable`, `@ts-ignore`, `any` 없음                                                                                                            | [자동]                     |
| 5   | `useQuery` 없음 (조회는 `useSuspenseQuery`)                                                                                                           | [자동]                     |
| 6   | 조회가 있으면 그 블록을 감싸는 `<Suspense>`와 `<ErrorBoundary>`가 pages(또는 widgets)에 있음                                                          | [자동]                     |
| 7   | 필수 케이스 테스트: 데이터 화면은 정상·빈·에러(+URL 시작 값), 동작은 성공·실패, Context 컴포넌트는 부품 동작. 네트워크는 MSW만                        | [수동]                     |
| 8   | 폴더 위치: 조회 → `entities/{명사}`, 행위 → `features/{도메인}/{동사}`, 조합 → `widgets`, 화면 → `pages/{도메인}/ui` (slice 바로 아래는 `index.ts`만) | [수동]                     |
| 9   | 계층: `entities/*/ui`는 props만 받음, api는 `api/`에만, 다른 slice는 `index.ts`로만                                                                   | [자동: lint] + [수동]      |
| 10  | 이름: 파일 kebab-case, `handle*` 핸들러, `on*` 콜백 prop, `is/has/can` boolean, 요청 타입 `Get…/Create…`                                              | [자동: lint 일부] + [수동] |
| 11  | 빈 상태는 데이터를 받은 컴포넌트가 직접 그림 (에러로 처리하지 않음)                                                                                   | [수동]                     |
| 12  | 만들지 않아도 되는 것을 만들지 않음 (쓰지 않는 store, 추상화, 파일)                                                                                   | [수동]                     |
| 13  | `fetch`는 `shared/api`에만 (slice api는 `http()`를 씀)                                                                                                | [자동]                     |
| 14  | 쿼리는 `entities/<도메인>/api/<도메인>.queries.ts`의 `queryOptions` 팩토리, invalidate는 팩토리 키로                                                  | [자동: lint] + [수동]      |
| 15  | 상태 위치: URL 상태는 nuqs(`model/use-*-search-params.ts`), compound 내부만 Context(`ui/`), 전역 store 새로 만들지 않음                               | [자동: lint 일부] + [수동] |
| 16  | 테스트 작성 방식: 해요체 이름, 역할·라벨로 찾기, userEvent, 프로젝트 모듈 mock 없음                                                                   | [자동: lint]               |

## 작업별

| 작업               | 항목                                                                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01 user-list       | `entities/user`에 model·api·hooks·ui, 목록 조립은 widget 또는 page. feature는 없어야 해요                                                                                                                                  |
| 02 create-todo     | 목록은 `entities/todo`, 추가는 `features/todo/create-todo`. mutation 성공 시 `todoQueryKeys`로 invalidate. 실패는 ErrorBoundary가 아니라 폼에서 보여 줌                                                                    |
| 01 user-list (URL) | 검색어·페이지가 `pages/user/model/use-*-search-params.ts`의 nuqs 훅에 있고, 쿼리 키 파라미터로 이어져요                                                                                                                    |
| 03 session-header  | 로그인 정보는 `entities/session/store`의 Zustand. 로그인·로그아웃은 `features/session/sign-in`, `sign-out`. 헤더는 `widgets`                                                                                               |
| 04 confirm-dialog  | `ConfirmDialog`는 `ui/` 안 compound 컴포넌트, 열림 상태는 Context로 부품끼리만 나누고 index에는 컴포넌트만 export. 조회는 `entities/api-key`, 삭제는 `features/api-key/delete-api-key`, invalidate는 `apiKeyQueries.all()` |
| 05 next-users      | `/notice`는 `'use cache'` + `cacheLife`(정적), `/users`는 page(서버)에서 `query(userQueries.list(...)).catch(noop)` + `HydrationBoundary`, 검색 UI만 `'use client'` ui/. `*.server.ts`는 `server-only`                     |
