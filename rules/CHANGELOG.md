# 하네스 규칙 변경 기록

새 항목은 맨 위에 써요. `/sonic-harness:update`가 이 기록과 git 로그로 무엇이 바뀌었는지 보여 줘요.

- 2026-10-20: lint 무시 목록에 `storybook-static` 추가. Storybook 빌드 결과까지 lint해서 느려지고 에러가 나던 문제
- 2026-10-20: 첫 버전. FSD 레이어 경계, 이름 규칙, Suspense + ErrorBoundary, Zustand는 store/에서만, MSW·테스트 구조
