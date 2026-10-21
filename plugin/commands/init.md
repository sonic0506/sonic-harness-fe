---
description: 이 프로젝트에 최신 하네스 적용 (규칙 파일, 템플릿, 패키지, tsconfig 연결)
allowed-tools: Bash(node:*), Bash(npm:*), Bash(npx:*), Bash(git:*), Bash(ls:*), Bash(cat:*), Bash(head:*), Bash(test:*), Bash(mv:*), Bash(mkdir:*), Read, Edit, Write
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
   - 디자인 시스템 sonic-ui(`@xonic0506/sonic-ui`)를 쓸지 물어요. 쓰면 5단계에서 함께 연결해요.
3. `harness.mjs init`을 실행해요. 출력의 "건너뛴 템플릿"을 기억해요.
4. `harness.mjs deps`를 실행해요(시간이 걸려요).
5. 직접 손볼 곳을 처리해요. 각각 무엇을 바꾸는지 말하고 진행해요.
   - **건너뛴 템플릿**: 프로젝트에 원래 있던 `eslint.config.*`, `prettier.config.*`, `vitest.config.*` 등이 하네스 템플릿과 다르면 diff를 보여 주고, 하네스 템플릿으로 바꿀지 물어요. 특히 `eslint.config.mjs`는 `./.sonic-harness/eslint.base.mjs`를 불러와야 해요.
   - 다른 lint 도구(예: Vite 템플릿의 oxlint, `.oxlintrc.json`)가 있으면 제거를 제안해요.
   - **Vite**: `vite.config.ts`에 `resolve: { tsconfigPaths: true }`를 넣어요. `src/App.tsx`·`src/App.css`·`src/index.css`가 있으면 `src/app/app.tsx`(이름 있는 export `App`, `AppProviders`로 감싸기)와 `src/app/styles/`로 옮기고, `src/main.tsx`는 `@/app/app`만 불러요. `src/assets`는 `src/shared/assets`로 옮겨요. `main.tsx`도 하네스 규칙을 따라요: `document.getElementById('root')!` 대신 없으면 에러를 던지고, `import.meta.env` 대신 `@/shared/config`의 `env`를 써요. 개발 화면 MSW: `main.tsx`에서 `env.DEV`일 때 `@/app/mocks/browser`의 `worker.start({ onUnhandledFrame: 'bypass' })` 뒤에 렌더해요.
   - **Next.js**: `src/app/`에 라우팅 파일(`layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico` 등)이 있으면 루트 `app/`으로 옮겨요(`src/app`은 FSD app 레이어). `app/layout.tsx`는 `@/app/providers`의 `AppProviders`로 감싸고, `app/page.tsx`는 `src/pages/<도메인>`을 다시 내보내기만 해요. 옮긴 뒤 `.next/`에 옛 경로 타입이 남아 typecheck가 실패하면 `npx next build`를 한 번 실행해 다시 만들어요.
   - **sonic-ui**(2단계에서 쓰기로 했을 때): 라우팅 파일을 옮긴 뒤에 해요. 기준은 `node_modules/@xonic0506/sonic-ui/README.md`예요.
     - 설치: `npm i @xonic0506/sonic-ui lucide-react @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono`, `npm i -D tailwindcss`와 Next는 `@tailwindcss/postcss`(루트 `postcss.config.mjs`: `export default { plugins: { '@tailwindcss/postcss': {} } };`), Vite는 `@tailwindcss/vite`(`vite.config.ts`의 `plugins`에 `tailwindcss()`).
     - 전역 CSS(Next `app/globals.css`, Vite `src/app/styles/`) 맨 위에 layer 순서 `@layer theme, base, sonic, components, utilities;` → `@import 'tailwindcss';` → `@import '@xonic0506/sonic-ui/styles.css';` → `@import '@xonic0506/sonic-ui/tailwind.css';` → `@fontsource/ibm-plex-sans`의 `400.css`·`500.css`·`600.css`와 `@fontsource/ibm-plex-mono/400.css`. create-next-app이 넣은 예시 스타일은 지워요. 글꼴은 `next/font`(이름이 바뀌어 sonic-ui가 못 찾아요)나 `<link>`(Next lint `no-page-custom-font`) 대신 fontsource로 불러와요.
     - 앱 루트: `<body className="bg-canvas font-sans text-default">`, 그 안을 `<div className="isolate">`로 감싸요(Dialog·Toast가 앱 z-index에 가려지지 않게). Vite는 `App` 최상단에 같은 클래스를 둬요.
     - `eslint.config.mjs`의 sonicDesign 두 줄 주석을 풀어요.
6. 확인: `npm run lint`, `npm run typecheck`, `npx vitest run --passWithNoTests`. 실패하면 고쳐요(규칙을 끄는 주석은 쓰지 않아요).
7. 끝나면 알려 줘요:
   - 적용 버전과 만든·바꾼 파일
   - `CLAUDE.md` 아래쪽에 이 프로젝트 정보를 적어 달라는 안내
   - sonic-ui를 연결하지 않았다면, 나중에 쓸 때 5단계의 sonic-ui 항목대로 연결하면 된다는 안내
   - hook은 새 세션부터 확실히 적용된다는 안내
