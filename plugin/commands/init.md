---
description: 이 프로젝트에 최신 하네스 적용 (규칙 파일, 템플릿, 패키지, tsconfig 연결)
argument-hint: '[design]'
allowed-tools: Bash(node:*), Bash(npm:*), Bash(npx:*), Bash(git:*), Bash(ls:*), Bash(cat:*), Bash(head:*), Bash(test:*), Bash(mv:*), Bash(mkdir:*), Read, Edit, Write
---

이 프로젝트(Vite 또는 Next.js + React + TypeScript)에 sonic-harness를 적용해요.
스크립트: `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs"`

## 지금 프로젝트

!`ls -a; cat package.json 2>/dev/null | head -30; test -d .sonic-harness && echo "(이미 하네스 있음)" || true`

인자: `$ARGUMENTS`

## 순서

1. 이미 `.sonic-harness/`가 있으면:
   - 인자가 `design`이면 "디자인 시스템 켜기"(아래)만 하고 끝내요. 무엇을 바꾸는지 먼저 보여 주고 확인을 받아요.
   - 아니면 멈추고 `/sonic-harness:update`를 안내해요.
2. 무엇을 할지 짧게 보여 주고 **사용자 확인을 받아요**. 이때 **"디자인 시스템(sonic-ui)을 쓰나요? (Y/N)"도 함께 물어요**(인자가 `design`이면 Y로 보고 묻지 않아요):
   - `.sonic-harness/`에 원본 최신 규칙을 받고, 없는 템플릿만 복사해요(있는 파일은 그대로 둬요).
   - tsconfig에 `.sonic-harness/tsconfig.strict.json`을 연결해요.
   - 패키지를 설치하고 npm scripts(lint, typecheck, test, e2e)를 설정해요.
   - Y면 sonic-ui 최신 버전을 설치하고 eslint·CSS·CLAUDE.md까지 연결해요. N이면 설치하지 않고, CLAUDE.md에 sonic-ui 문서를 불러오지 않아요.
3. `harness.mjs init`을 실행해요. 출력의 "건너뛴 템플릿"을 기억해요. 프로젝트가 git 저장소 루트가 아니면(npm workspaces 모노레포의 `apps/web` 같은 앱) `.husky/`, `commitlint.config.mjs`, `.github/`는 복사하지 않고 `deps`도 `scripts.prepare`에 husky를 넣지 않아요(Next는 `next typegen`만). 출력의 안내대로 저장소 루트에 husky·commitlint·CI가 없으면 만들자고 제안해요. `lint-staged.config.mjs`는 앱에 그대로 둬요. 고른 값은 `lock.json`의 `designSystem`에 남아요(init은 `false`로 쓰고, Y면 6번의 `design`이 `true`로 바꿔요).
4. `harness.mjs deps`를 실행해요(시간이 걸려요).
5. 직접 손볼 곳을 처리해요. 각각 무엇을 바꾸는지 말하고 진행해요.
   - **건너뛴 템플릿**: 프로젝트에 원래 있던 `eslint.config.*`, `prettier.config.*`, `vitest.config.*` 등이 하네스 템플릿과 다르면 diff를 보여 주고, 하네스 템플릿으로 바꿀지 물어요. 특히 `eslint.config.mjs`는 `./.sonic-harness/eslint.base.mjs`를 불러와야 해요.
   - 건너뛴 `CLAUDE.md`를 합칠 때 `@.sonic-harness/harness.md`는 넣고, sonic-ui 문서 두 줄(`@…node_modules/@xonic0506/sonic-ui/…`)은 넣지 않아요(Y면 `design`이 넣어요).
   - 다른 lint 도구(예: Vite 템플릿의 oxlint, `.oxlintrc.json`)가 있으면 제거를 제안해요.
   - **Vite**: `vite.config.ts`에 `resolve: { tsconfigPaths: true }`를 넣어요. `src/App.tsx`·`src/App.css`·`src/index.css`가 있으면 `src/app/app.tsx`(이름 있는 export `App`, `AppProviders`로 감싸기)와 `src/app/styles/`로 옮기고, `src/main.tsx`는 `@/app/app`만 불러요. `src/assets`는 `src/shared/assets`로 옮겨요. `main.tsx`도 하네스 규칙을 따라요: `document.getElementById('root')!` 대신 없으면 에러를 던지고, `import.meta.env` 대신 `@/shared/config`의 `env`를 써요. 개발 화면 MSW: `main.tsx`에서 `env.DEV`일 때 `@/app/mocks/browser`의 `worker.start({ onUnhandledFrame: 'bypass' })` 뒤에 렌더해요.
   - **Next.js**: `src/app/`에 라우팅 파일(`layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico` 등)이 있으면 루트 `app/`으로 옮겨요(`src/app`은 FSD app 레이어). `app/layout.tsx`는 `@/app/providers`의 `AppProviders`로 감싸고, `app/page.tsx`는 `src/pages/<도메인>`을 다시 내보내기만 해요. 옮긴 뒤 `.next/`에 옛 경로 타입이 남아 typecheck가 실패하면 `npx next build`를 한 번 실행해 다시 만들어요.
6. Y를 골랐으면 "디자인 시스템 켜기"(아래)를 해요.
7. 확인: `npm run lint`, `npm run typecheck`, `npx vitest run --passWithNoTests`. 실패하면 고쳐요(규칙을 끄는 주석은 쓰지 않아요).
8. 끝나면 알려 줘요:
   - 적용 버전과 만든·바꾼 파일
   - `CLAUDE.md` 아래쪽에 이 프로젝트 정보를 적어 달라는 안내
   - Y면 설치된 sonic-ui 버전(`package.json`의 `^` 범위), 쓰는 법은 `node_modules/@xonic0506/sonic-ui/README.md`라는 안내
   - N이면 나중에 켜는 방법: `/sonic-harness:init design`
   - hook은 새 세션부터 확실히 적용된다는 안내

## 디자인 시스템 켜기

기준은 sonic-ui README의 "시작하기"예요(설치 뒤 `node_modules/@xonic0506/sonic-ui/README.md`).

1. 라우팅 파일을 옮긴 뒤에 `harness.mjs design`을 실행해요. sonic-ui, `lucide-react`, 글꼴(`@fontsource/ibm-plex-sans-kr`, `@fontsource/ibm-plex-mono`)을 latest로 설치하고(`package.json`에는 `^` 범위), Tailwind가 없으면 `tailwindcss`와 Next `@tailwindcss/postcss`·Vite `@tailwindcss/vite`를 설치하고, `eslint.config.mjs`의 sonicDesign 주석을 풀고, `CLAUDE.md`의 `@.sonic-harness/harness.md` 아래에 `@node_modules/@xonic0506/sonic-ui/DESIGN.md`·`AI-RULES.md`를 넣고(모노레포라 패키지가 루트 `node_modules`에 있으면 `@../../node_modules/…`처럼 실제 위치의 상대 경로로 넣어요), `lock.json`에 `designSystem: true`를 기록해요. 출력의 "직접 할 일"이 있으면 처리해요.
   - Tailwind를 새로 설치했으면 연결해요. Next는 루트 `postcss.config.mjs`(`export default { plugins: { '@tailwindcss/postcss': {} } };`), Vite는 `vite.config.ts`의 `plugins`에 `tailwindcss()`(`@tailwindcss/vite`)예요.
2. 전역 CSS(Next `app/globals.css`, Vite `src/app/styles/index.css`) 맨 위에 넣어요.
   ```css
   /* sonic은 preflight(base)보다 뒤, 이 프로젝트의 components/utilities보다 앞에 둬요(sonic-ui README). */
   @layer theme, base, sonic, components, utilities;
   @import 'tailwindcss';
   @import '@xonic0506/sonic-ui/styles.css';
   @import '@xonic0506/sonic-ui/tailwind.css';
   ```
   이미 있던 `@import 'tailwindcss';`는 이 묶음으로 옮겨 하나만 남겨요.
3. 같은 파일에서 바로 이어서 글꼴을 불러와요. sonic-ui는 글꼴 이름 `"IBM Plex Sans KR"`, `"IBM Plex Mono"`를 찾아서, 이름을 바꾸는 `next/font` 기본 설정(`next/font/google`)은 쓰지 않아요. `<link>`도 Next lint(`no-page-custom-font`)에 걸려서 쓰지 않아요. create-next-app이 넣은 `Geist` 같은 `next/font` 코드와 그 CSS 변수는 지워요.
   ```css
   /* sonic-ui는 글꼴 이름 "IBM Plex Sans KR"/"IBM Plex Mono"를 찾아서, 이름을 바꾸는 next/font 대신 fontsource로 불러와요. */
   @import '@fontsource/ibm-plex-sans-kr/400.css';
   @import '@fontsource/ibm-plex-sans-kr/500.css';
   @import '@fontsource/ibm-plex-sans-kr/600.css';
   @import '@fontsource/ibm-plex-mono/400.css';
   ```
4. 앱 루트에 `isolation: isolate`를 줘요. 앱의 z-index가 `body` 아래에 그려지는 Dialog·Toast를 가리지 않게 해요. Next는 `app/layout.tsx`의 `<body>` 안, Vite는 `src/app/app.tsx`에서 `AppProviders` 바깥을 `<div className="isolate">`로 감싸요.
5. create-next-app·Vite 시작 CSS의 색·글꼴(`--background`·`--foreground` 변수, `prefers-color-scheme` 블록, `body`의 `background`·`color`·`font-family`)은 지우고 sonic-ui 토큰으로 바꿔요. Next는 `<body className="bg-canvas font-sans text-default">`, Vite는 `App` 최상단 `div`에 같은 클래스를 둬요. 테마는 `<html data-theme="light|dark">`로 바꿔요.
