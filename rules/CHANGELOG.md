# 하네스 규칙 변경 기록

새 항목은 맨 위에 써요. `/sonic-harness:update`가 이 기록과 git 로그로 무엇이 바뀌었는지 보여 줘요.

- 2026-10-21: init이 sonic-ui 연결(설치, Tailwind v4, 전역 CSS layer·fontsource 글꼴, 앱 루트 클래스, sonicDesign lint)까지 해요. Next `prepare`는 `husky && next typegen`(CI에서 이미지 import 타입이 없어 lint·typecheck가 실패하던 문제) (0.6.4)
- 2026-10-21: slice 바로 아래는 `index.ts`만, 페이지 컴포넌트도 `ui/`에(예시·lint 샘플·eval sandbox 경로). Next 규칙 보강(sonic-ui-site에서 막힌 곳): 루트 `pages/` 때문에 `usePathname` 등이 `null`일 수 있음, Zustand `persist`는 `skipHydration` + `rehydrate()`, 11절 "라우트 파일"(동적 라우트 `generateStaticParams` 다시 내보내기, `app/not-found.tsx` 필수, `error.tsx`의 `'use client'` 예외, CI용 `prepare`에 `next typegen`). CI 템플릿 actions v4→v7(Node 20 deprecated)
- 2026-10-21: 템플릿 코드 포맷을 하네스 Prettier 설정에 맞춰요(`npm run format:templates`, contribute도 실행)
- 2026-10-21: deprecated API 금지(`no-deprecated`). TanStack Query 5.104 기준으로 서버 prefetch는 `query(...).catch(noop)`, `getQueryClient`는 `environmentManager.isServer()`
- 2026-10-21: lint 무시 목록에 `storybook-static` 추가. Storybook 빌드 결과까지 lint해서 느려지고 에러가 나던 문제
- 2026-10-21: contribute가 프로젝트에서 고친 템플릿도 원본에 PR로 올려요(규칙은 이름, 템플릿은 프로젝트 기준 경로)
- 2026-10-21: Next MockStarter가 MSW를 한 번만 시작해요(개발 화면 StrictMode에서 두 번 시작하면 에러)
- 2026-10-21: Next 개발 화면 MSW 템플릿(instrumentation + mock-starter, `NEXT_PUBLIC_API_MOCKING`). 템플릿 import를 새 정렬 규칙에 맞춤
- 2026-10-21: TypeScript 세부와 환경 변수. import 정렬(simple-import-sort), `any`·`no-unsafe-*` 금지, `unknown`은 경계에서만, `as`·`!`·`enum` 금지, switch 빠짐 검사. 환경 변수는 `shared/config/env.ts`(zod)에서만 읽어요(Vite·Next env 템플릿, http가 env 사용). update 뒤 `npm run lint -- --fix`로 import 순서를 맞춰요. Next init은 tsconfig에서 `.next/dev`를 빼요(next dev가 만드는 타입 파일이 noUnused를 어겨요)
- 2026-10-21: Next.js 기준. 데이터 성격별 렌더링 결정표(Cache Components), 서버 prefetch + HydrationBoundary, 'use client'는 ui/·app/providers에만, *.server.ts는 server-only. Next 전용 템플릿(getQueryClient, 서버용 http, @next/eslint-plugin-next)
- 2026-10-21: update가 원본에서 바뀐 템플릿을 전달해요(안 고친 파일은 갱신, 고친 파일은 diff로 합치기). `renderWithQuery`에 nuqs `hasMemory`. check는 CI·스크립트 파일을 근거로 판단
- 2026-10-21: 테스트 기준. 사용자 행동 중심 통합 테스트와 필수 케이스, 네트워크는 MSW만. lint: testing-library·vitest 플러그인, 해요체 테스트 이름, `*ByTestId`·프로젝트 모듈 `vi.mock` 금지(로컬 규칙)
- 2026-10-21: QueryKey는 `*.queries.ts`의 queryOptions 팩토리(`@tanstack/eslint-plugin-query` strict). 상태 관리 결정표: URL은 nuqs, Context는 compound 내부만, Zustand는 selector 필수·persist는 UI 환경설정만. 로컬 ESLint 플러그인(eslint-plugin-sonic.mjs) 추가
- 2026-10-21: 커밋 전 검사(husky pre-commit + lint-staged)와 CI(GitHub Actions: lint·typecheck·test·build) 템플릿 추가. 기존 프로젝트는 update가 새 템플릿으로 제안해요
- 2026-10-20: Prettier 기본값 정리. printWidth 100 → 80, semi·tabWidth 2를 명시. update 뒤 `npm run format`으로 다시 포맷해요
- 2026-10-20: 첫 버전. FSD 레이어 경계, 이름 규칙, Suspense + ErrorBoundary, Zustand는 store/에서만, MSW·테스트 구조
