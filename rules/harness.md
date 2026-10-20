# 코딩 하네스 (sonic-harness-fe)

React + TypeScript 프로젝트에 공통으로 쓰는 코딩 규칙이에요. 이 문서만 읽어도 코드를 쓸 수 있게 썼어요.
디자인 규칙(색, 간격, 컴포넌트 선택)은 다루지 않아요. 그건 sonic-ui의 DESIGN.md를 따라요.

**규칙 대부분은 ESLint가 막아요.** 파일을 고치면 hook이 Prettier와 `eslint --fix`를 실행하고,
남은 에러를 돌려줘요. 에러 메시지가 오면 이 문서의 규칙에 맞게 고쳐요. 규칙을 끄는 주석(`eslint-disable`)은 쓰지 않아요.

## 1. 구조 (FSD)

```
src/
├─ app/        전역 설정: providers, router, styles, layouts, config
├─ pages/      라우트 단위 화면 조립       pages/{domain}/
├─ widgets/    여러 도메인을 합친 UI 블록    widgets/{fusion-domain}/
├─ features/   사용자 행위(CUD)            features/{domain}/{feature}/   feature는 동사: create-user, sign-in
├─ entities/   도메인 명사(Read)           entities/{domain}/             domain은 명사: user, order
└─ shared/     도메인을 모르는 공용 자원     shared/{ui,api,lib,hooks,model,assets}/
```

slice 안의 segment는 필요한 것만 만들어요.

| segment | 담는 것                                 | 파일 이름                                       |
| ------- | --------------------------------------- | ----------------------------------------------- |
| `ui`    | React 컴포넌트                          | `user-row.tsx`                                  |
| `model` | DTO, 타입, zod schema                   | `user.dto.ts`, `user.schema.ts`, `user.type.ts` |
| `api`   | 서버 요청 함수                          | `user.api.ts`                                   |
| `hooks` | Query/Mutation 훅, UI와 model을 잇는 훅 | `use-users-query.ts`                            |
| `store` | Zustand store                           | `use-session-store.ts`                          |
| `lib`   | 순수 함수, 포맷터                       | `date-formatters.ts`                            |

### import 규칙 (lint: `boundaries/dependencies`)

- 위 레이어는 **아래 레이어만** 가져와요: `app → pages → widgets → features → entities → shared`.
- 같은 레이어의 다른 slice는 가져오지 않아요. 예: feature → feature, entity → entity는 안 돼요. 둘을 합쳐야 하면 위 레이어(widget, page)에서 조립해요.
- 다른 slice는 **`index.ts`(public API)로만** 가져와요. `@/entities/user`는 되고 `@/entities/user/ui/user-row`는 안 돼요. shared는 segment마다 index가 있어요: `@/shared/api`.
- `index.ts`에는 밖에서 쓰는 것만 export해요.
- slice 안은 상대 경로(`../model/user.dto`), slice 밖은 `@/` 별칭을 써요.
- Next.js(App Router): 라우팅용 `app/`은 **프로젝트 루트**에 두고, route 파일은 `src/pages`를 다시 내보내기만 해요. FSD 레이어는 `src/`에 있어요. 루트에 빈 `pages/` 폴더(`.gitkeep`)를 두면 Next가 `src/pages`를 Pages Router로 읽지 않아요.

```tsx
// app/users/page.tsx (Next 루트)
export { UserListPage as default } from '@/pages/user';
```

## 2. 데이터 흐름

```
shared/api (http 클라이언트)
  → entities/{d}/api + hooks   조회: useSuspenseQuery
  → features/{d}/{f}/api + hooks  생성·수정·삭제: useMutation
  → entities/*/ui              props로만 데이터를 받음 (api, hooks, store import 금지)
  → widgets / pages            훅을 불러 데이터를 내려 주고 Suspense·ErrorBoundary 배치
```

- `fetch`는 `api/` segment에서만 써요. axios는 쓰지 않아요(lint).
- OpenAPI 스펙이 있으면 `npx openapi-typescript <스펙> -o src/shared/api/schema.d.ts`로 타입을 만들고, DTO는 거기서 꺼내 써요. 손으로 다시 쓰지 않아요.
- 쿼리 키는 entity의 hooks 파일에 `xxxQueryKeys` 객체로 모아요. feature는 그걸 import해서 invalidate해요.
- mock은 MSW예요. handler는 해당 slice의 `api/*.mock.ts`에 만들고 그 slice `index.ts`로 export해요(`userHandlers`). 모으는 곳은 **`app/mocks/handlers.ts`** 하나예요(shared는 entities를 몰라서 shared에서 모으지 않아요).
  - 테스트: `vitest.setup.ts`가 `shared/testing`의 `server`에 이 handler를 등록해요. 테스트에서는 `server.use(...)`로 빈 목록·에러만 덮어써요. 테스트마다 `setupServer`를 새로 만들지 않아요.
  - 개발 화면(Vite): `src/main.tsx`에서 dev일 때만 `@/app/mocks/browser`의 `worker.start()` 뒤에 렌더해요. `public/mockServiceWorker.js`는 `npx msw init public --save`로 만들어요(apply.sh가 해요).

```ts
// shared/api/http.ts
export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) throw new HttpError(response.status, path);
  return (await response.json()) as T;
}

// entities/user/api/user.api.ts
export const getUsers = (params: GetUsersParams) => http<UserDto[]>(`/users?page=${params.page}`);

// entities/user/hooks/use-users-query.ts
export const userQueryKeys = {
  all: ['user'] as const,
  list: (page: number) => [...userQueryKeys.all, 'list', page] as const,
};
export function useUsersQuery(page: number) {
  return useSuspenseQuery({ queryKey: userQueryKeys.list(page), queryFn: () => getUsers({ page }) });
}

// features/user/create-user/hooks/use-create-user-mutation.ts
export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userQueryKeys.all }),
  });
}

// entities/user/ui/user-row.tsx — props만 받아요
export function UserRow({ user, onSelect }: UserRowProps) { … }
```

## 3. 로딩과 에러 (Suspense + ErrorBoundary)

- 조회는 `useSuspenseQuery`만 써요. `useQuery`는 lint가 막아요. 그래서 컴포넌트 안에 `isLoading`/`isError` 분기가 없어요.
- 로딩은 `<Suspense fallback>`, 에러는 `react-error-boundary`의 `<ErrorBoundary>`가 맡아요. 둘 다 **데이터를 쓰는 블록 바로 바깥**(보통 page가 widget을 감쌀 때)에 둬요. 페이지 전체를 하나로 감싸지 않아요.
- 다시 시도는 `QueryErrorResetBoundary`의 `reset`과 ErrorBoundary의 `resetErrorBoundary`를 함께 불러요.
- 빈 목록(데이터 0건)은 에러가 아니에요. 데이터를 받은 컴포넌트가 직접 빈 상태를 그려요.
- mutation 결과(성공·실패)는 Toast로 알려요. mutation 에러는 ErrorBoundary로 보내지 않아요.
- `app/providers`에 앱 전체 ErrorBoundary 하나를 두어 렌더 예외를 받아요.

```tsx
// pages/user/user-list-page.tsx
export function UserListPage() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <ListError onRetry={resetErrorBoundary} />
          )}
        >
          <Suspense fallback={<UserListSkeleton />}>
            <UserListSection />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

## 4. 상태 관리

| 상태                                      | 둘 곳                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| 서버 데이터                               | TanStack Query. 다른 곳에 복사하지 않아요                                        |
| URL로 표현할 수 있는 것(필터, 페이지, 탭) | search params                                                                    |
| 한 컴포넌트 안                            | `useState`                                                                       |
| 앱 전역 클라이언트 상태                   | Zustand. **지금은 로그인 정보만**: `entities/session/store/use-session-store.ts` |

Zustand 규칙:

- `zustand`는 `store/` segment에서만 import해요(lint).
- 서버에서 받은 목록이나 상세는 넣지 않아요. Query 캐시가 그 역할이에요.
- store 하나에 한 관심사만 둬요. 새 전역 store가 필요하면 먼저 사용자에게 물어봐요.
- 컴포넌트에서는 selector로 필요한 값만 꺼내요: `useSessionStore((s) => s.session)`.

## 5. 이름 규칙

| 대상                       | 규칙                                                                                 | 예                                                          | lint   |
| -------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------ |
| 폴더, 파일                 | kebab-case                                                                           | `user-profile-card.tsx`, `use-users-query.ts`               | ✓      |
| 폴더 수                    | 복수형 (`hooks`, `assets`). FSD segment(`ui`, `api`, `model`, `lib`, `store`)는 예외 |                                                             |        |
| 컴포넌트, 타입, 인터페이스 | PascalCase                                                                           | `UserProfileCard`, `UserDto`                                | ✓ 타입 |
| 훅                         | `use` + PascalCase                                                                   | `useUsersQuery`, `useCreateUserMutation`                    |        |
| 변수, 함수                 | camelCase                                                                            | `userName`, `getUser`                                       | ✓      |
| 상수                       | UPPER_SNAKE_CASE                                                                     | `MAX_RETRY_COUNT`                                           |        |
| boolean                    | `is`·`has`·`can`                                                                     | `isLoading`, `hasError`, `canSubmit`                        | ✓      |
| 이벤트 핸들러              | `handle` + 대상 + 동작                                                               | `handleInputChange`                                         |        |
| 콜백 prop                  | `on` + 동작                                                                          | `onSelect`                                                  |        |
| 요청 타입                  | GET 목록 `Get+복수`, 단건 `Get+단수+By조건`, `Create`/`Update`/`Delete`+단수         | `GetUsersParams`, `GetUserById`, `CreateUser`               |        |
| 에셋                       | 파일 kebab-case, export는 PascalCase                                                 | `export { default as UserAvatar } from './user-avatar.svg'` |        |

- `data`, `temp`, `info`처럼 뜻 없는 이름은 쓰지 않아요. 같은 뜻은 같은 낱말로 써요(`user`와 `member` 섞어 쓰지 않기).
- 하위 컴포넌트는 이름 있는 export로만 내보내요(`CardHeader`). `default export`는 Next route 파일에서만 써요.

## 6. TypeScript

- `.sonic-harness/tsconfig.strict.json`을 extends해요: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- `any`는 쓰지 않아요(lint). 모르는 값은 `unknown`으로 받고 zod schema로 좁혀요.
- 타입만 가져올 때는 `import type`을 써요.

## 7. 테스트

| 종류          | 도구                     | 위치                   | 무엇을                                          |
| ------------- | ------------------------ | ---------------------- | ----------------------------------------------- |
| 단위·컴포넌트 | Vitest + Testing Library | 소스 옆 `*.test.ts(x)` | `lib` 순수 함수, hooks, ui                      |
| API 연동      | MSW (`setupServer`)      | 같은 테스트 안         | 훅·화면이 성공, 빈 목록, 실패를 어떻게 그리는지 |
| E2E           | Playwright               | `e2e/*.spec.ts`        | 핵심 흐름(로그인, 만들기)                       |

- 테스트는 사용자가 보는 것으로 확인해요: `getByRole`, `findByText`. 구현 세부(state, className)는 확인하지 않아요.
- Suspense 화면은 `findBy…`로 기다려요. 렌더는 `@/shared/testing`의 `renderWithQuery`를 써요(테스트마다 새 `QueryClient`, `retry: false`).
- jest-dom 타입은 `shared/testing/jest-dom.d.ts`가 넣어요. tsconfig `types`를 고치지 않아요.
- 데이터 화면은 정상·빈 목록·에러 세 경우를 테스트해요(로딩은 fallback이 보이는지만).

```tsx
import { renderWithQuery, server } from '@/shared/testing';

it('사용자가 없으면 빈 상태를 보여 줘요', async () => {
  server.use(http.get('/api/users', () => HttpResponse.json([])));
  renderWithQuery(<UserListPage />);
  expect(await screen.findByText('사용자가 없어요.')).toBeInTheDocument();
});
```

## 8. 커밋

Conventional Commits, 설명은 한국어예요. commitlint가 `commit-msg`에서 막아요.

커밋 전(`pre-commit`)에는 lint-staged가 staged 파일에 Prettier와 `eslint --fix`를 실행해요. 고칠 수 있는 건 고쳐서 커밋하고, 남은 lint 에러가 있으면 커밋이 막혀요. PR과 main push마다 CI(`.github/workflows/ci.yml`)가 lint·typecheck·test·build를 실행해요. 검사를 건너뛰는 `--no-verify`는 쓰지 않아요.

```
feat(user): 사용자 목록 화면 추가
fix(session): 로그아웃 뒤 이전 이름이 남는 문제 수정
```

type: `feat` · `fix` · `refactor` · `test` · `docs` · `chore` · `style` · `perf` · `build` · `ci`. scope는 slice 이름이에요.

## 9. 하네스 파일 관리

이 프로젝트는 `sonic-harness` Claude Code 플러그인으로 하네스를 받아요.

| 위치                                                                                                                            | 주인        | 고치는 법                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `.sonic-harness/` (이 문서, `eslint.base.mjs`, `prettier.base.mjs`, `commitlint.base.mjs`, `tsconfig.strict.json`, `lock.json`) | 하네스 원본 | 공통 규칙을 바꿀 때만 고쳐요. 고친 뒤 `/sonic-harness:contribute`로 원본에 PR을 올려요 |
| `eslint.config.mjs`, `tsconfig.json`, `CLAUDE.md`, `src/`                                                                       | 이 프로젝트 | 이 프로젝트만의 규칙과 설정은 여기에 둬요                                              |

- `lock.json`은 손으로 고치지 않아요. 플러그인 명령이 관리해요.
- 명령어: `/sonic-harness:status`(상태), `/sonic-harness:update`(최신 규칙 받기), `/sonic-harness:check`(바뀐 규칙으로 코드 점검), `/sonic-harness:contribute`(원본에 PR).

## 10. 작업 순서

1. 어느 레이어와 slice에 둘지 먼저 정해요. Read는 entities, 행위는 features, 조합은 widgets예요.
2. model → api → hooks → ui → (widget) → page 순서로 만들어요.
3. 각 slice의 `index.ts`에 밖에서 쓸 것만 export해요.
4. MSW handler와 테스트를 함께 써요.
5. `npm run lint`, `npm run typecheck`, `npm test`가 통과해야 끝이에요.
