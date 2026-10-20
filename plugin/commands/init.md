---
description: 이 프로젝트에 최신 하네스 적용 (규칙 파일, 템플릿, 패키지, tsconfig 연결)
allowed-tools: Bash(node:*), Bash(npm:*), Bash(npx:*), Bash(git:*), Bash(ls:*), Bash(cat:*), Bash(test:*), Bash(mv:*), Bash(mkdir:*), Read, Edit, Write
---

이 프로젝트(Vite 또는 Next.js + React + TypeScript)에 sonic-harness를 적용해요.
스크립트: `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs"`

## 지금 프로젝트

!`ls -a; cat package.json 2>/dev/null | head -30; test -d .sonic-harness && echo "(이미 하네스 있음)" || true`

## 순서

1. 이미 `.sonic-harness/`가 있으면 멈추고 `/sonic-harness:update`를 안내해요.
2. 무엇을 할지 짧게 보여 주고 **사용자 확인을 받아요**:
   - `.sonic-harness/`에 원본 최신 규칙을 받고, 없는 템플릿만 복사해요(있는 파일은 그대로 둬요).
   - tsconfig에 `.sonic-harness/tsconfig.strict.json`을 연결해요.
   - 패키지를 설치하고 npm scripts(lint, typecheck, test, e2e)를 설정해요.
3. `harness.mjs init`을 실행해요. 출력의 "건너뛴 템플릿"을 기억해요.
4. `harness.mjs deps`를 실행해요(시간이 걸려요).
5. 직접 손볼 곳을 처리해요. 각각 무엇을 바꾸는지 말하고 진행해요.
   - **건너뛴 템플릿**: 프로젝트에 원래 있던 `eslint.config.*`, `prettier.config.*`, `vitest.config.ts` 등이 하네스 템플릿과 다르면 diff를 보여 주고, 하네스 템플릿으로 바꿀지 물어요. 특히 `eslint.config.mjs`는 `./.sonic-harness/eslint.base.mjs`를 불러와야 해요.
   - 다른 lint 도구(예: Vite 템플릿의 oxlint, `.oxlintrc.json`)가 있으면 제거를 제안해요.
   - **Vite**: `vite.config.ts`에 `resolve: { tsconfigPaths: true }`를 넣어요. `src/App.tsx`·`src/App.css`·`src/index.css`가 있으면 `src/app/app.tsx`(이름 있는 export `App`, `AppProviders`로 감싸기)와 `src/app/styles/`로 옮기고, `src/main.tsx`는 `@/app/app`만 불러요. `src/assets`는 `src/shared/assets`로 옮겨요. 개발 화면 MSW: `main.tsx`에서 dev일 때 `@/app/mocks/browser`의 `worker.start({ onUnhandledFrame: 'bypass' })` 뒤에 렌더해요.
   - **Next.js**: `src/app/`에 라우팅 파일(`layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico` 등)이 있으면 루트 `app/`으로 옮겨요(`src/app`은 FSD app 레이어). `app/layout.tsx`는 `@/app/providers`의 `AppProviders`로 감싸고, `app/page.tsx`는 `src/pages/<도메인>`을 다시 내보내기만 해요.
6. 확인: `npm run lint`, `npm run typecheck`, `npx vitest run --passWithNoTests`. 실패하면 고쳐요(규칙을 끄는 주석은 쓰지 않아요).
7. 끝나면 알려 줘요:
   - 적용 버전과 만든·바꾼 파일
   - `CLAUDE.md` 아래쪽에 이 프로젝트 정보를 적어 달라는 안내
   - sonic-ui를 쓰면 `npm i @xonic0506/sonic-ui` 후 `eslint.config.mjs`의 sonicDesign 주석을 풀라는 안내
   - hook은 새 세션부터 확실히 적용된다는 안내
