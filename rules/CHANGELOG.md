# 하네스 규칙 변경 기록

새 항목은 맨 위에 써요. `/sonic-harness:update`가 이 기록과 git 로그로 무엇이 바뀌었는지 보여 줘요.

- 2026-10-21: 테스트 기준. 사용자 행동 중심 통합 테스트와 필수 케이스, 네트워크는 MSW만. lint: testing-library·vitest 플러그인, 해요체 테스트 이름, `*ByTestId`·프로젝트 모듈 `vi.mock` 금지(로컬 규칙)
- 2026-10-21: QueryKey는 `*.queries.ts`의 queryOptions 팩토리(`@tanstack/eslint-plugin-query` strict). 상태 관리 결정표: URL은 nuqs, Context는 compound 내부만, Zustand는 selector 필수·persist는 UI 환경설정만. 로컬 ESLint 플러그인(eslint-plugin-sonic.mjs) 추가
- 2026-10-21: 커밋 전 검사(husky pre-commit + lint-staged)와 CI(GitHub Actions: lint·typecheck·test·build) 템플릿 추가. 기존 프로젝트는 update가 새 템플릿으로 제안해요
- 2026-10-20: Prettier 기본값 정리. printWidth 100 → 80, semi·tabWidth 2를 명시. update 뒤 `npm run format`으로 다시 포맷해요
- 2026-10-20: 첫 버전. FSD 레이어 경계, 이름 규칙, Suspense + ErrorBoundary, Zustand는 store/에서만, MSW·테스트 구조
