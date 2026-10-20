<!-- prettier-ignore -->
<div align="center">

<img src="./assets/mascot.webp" alt="sonic-harness mascot" width="160">

# sonic-harness

_React + TypeScript 코딩 규칙을 글이 아니라 도구로 지키게 하는 Claude Code 플러그인_

[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-e8650c?style=flat-square)](#시작하기)
[![Plugin version](https://img.shields.io/github/package-json/v/sonic0506/sonic-harness-fe?filename=plugin%2F.claude-plugin%2Fplugin.json&style=flat-square&label=version)](./plugin/.claude-plugin/plugin.json)
[![React + TypeScript](https://img.shields.io/badge/React_+_TypeScript-Vite_·_Next.js-3178c6?style=flat-square&logo=typescript&logoColor=white)](#요구-사항)
[![Architecture: FSD](https://img.shields.io/badge/architecture-FSD-0e9f6e?style=flat-square)](./rules/harness.md)

[개요](#개요) • [시작하기](#시작하기) • [명령어](#명령어) • [동작 방식](#동작-방식) • [규칙 바꾸기](#규칙-바꾸기) • [FAQ](#faq)

</div>

규칙을 문서로만 남겨 두면 사람도 AI도 잊어요. sonic-harness는 FSD 레이어 경계, 이름 규칙, 데이터 흐름 같은 규칙 대부분을 ESLint로 옮기고, Claude가 파일을 고칠 때마다 그 검사를 자동으로 실행해요. 어긴 코드는 저장 전에 막히거나, 저장 직후 에러로 돌아와 Claude가 직접 고쳐요.

> [!TIP]
> 하네스는 `.sonic-harness/lock.json`이 있는 프로젝트에서만 동작해요. 플러그인을 설치해도 다른 프로젝트에는 영향이 없어요.

## 개요

하네스는 세 층으로 되어 있어요.

| 층        | 파일                                                                                  | 하는 일                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 도구      | `eslint.base.mjs`, `prettier.base.mjs`, `tsconfig.strict.json`, `commitlint.base.mjs` | FSD 레이어 경계, 이름, import 제한, strict TypeScript, 커밋 형식을 검사해요                                               |
| hooks     | `plugin/hooks/`                                                                       | 파일을 쓰기 전에 경로(kebab-case)를 검사하고, 쓴 뒤 Prettier와 `eslint --fix`를 실행해요. 남은 에러는 Claude에게 돌려줘요 |
| 규칙 문서 | `harness.md`                                                                          | 어디에 둘지 판단하는 기준과 예시 코드예요. lint로 잡기 어려운 규칙도 여기에 있어요                                        |

규칙은 이 저장소 한 곳에서 관리하고, 각 프로젝트는 명령어로 받아 써요. 프로젝트에서 고친 공통 규칙은 PR로 이 저장소에 돌려보내요.

디자인 규칙(DESIGN.md, 컴포넌트 사용)은 다루지 않아요. 그건 [sonic-ui](https://github.com/sonic0506/sonic-ui)가 맡아요.

## 주요 기능

- **FSD 레이어 강제**: `app → pages → widgets → features → entities → shared` 방향만 허용하고, 다른 slice는 `index.ts`로만 가져오게 해요(`eslint-plugin-boundaries`).
- **데이터 흐름 고정**: 조회는 `*.queries.ts`의 `queryOptions` 팩토리와 `useSuspenseQuery`, 변경은 `useMutation`, `entities/*/ui`는 props로만 데이터를 받아요. `fetch`는 `api/`에서만 써요.
- **상태는 정해진 곳에**: URL 상태는 nuqs, 묶인 컴포넌트 내부만 Context, 여러 화면이 쓰는 클라이언트 상태만 Zustand(selector 필수). 위치와 사용법을 lint가 확인해요.
- **자동 수정 루프**: hook이 Claude의 모든 파일 수정 뒤에 format과 lint를 돌리고, 고치지 못한 에러를 다시 Claude에게 넘겨요.
- **원본과 동기화**: `lock.json`이 받은 버전과 파일 해시를 기억해서, 원본의 변경과 프로젝트의 변경을 구분해 합쳐요.
- **사람 코드도 같은 규칙**: 커밋 전 lint-staged(format + lint)와 CI(lint·typecheck·test·build)가 Claude hook과 같은 규칙으로 검사해요.
- **검증 장치**: 규칙마다 lint 샘플 테스트가 있고, Claude의 실제 행동을 기준 작업 3개로 평가해요.

## 시작하기

### 요구 사항

- [Claude Code](https://claude.com/claude-code)
- Node.js 20 이상, git
- Vite 또는 Next.js(App Router) + React + TypeScript 프로젝트
- `contribute`를 쓰려면 [GitHub CLI](https://cli.github.com)(`gh auth login`)

### 설치

Claude Code에서 한 번만 실행해요.

```text
/plugin marketplace add sonic0506/sonic-harness-fe
/plugin install sonic-harness@sonic-harness
```

### 프로젝트에 적용

프로젝트 루트에서 Claude Code를 열고 실행해요.

```text
/sonic-harness:init
```

init은 다음을 처리해요.

1. 원본 최신 규칙을 `.sonic-harness/`에 받고, 없는 템플릿 파일만 복사해요.
2. tsconfig에 `.sonic-harness/tsconfig.strict.json`을 연결하고, 패키지와 npm scripts를 설치해요.
3. Vite는 `App.tsx`를 `src/app/`으로 옮기고, Next.js는 라우팅 파일을 루트 `app/`으로 옮겨요.
4. `npm run lint`, `npm run typecheck`가 통과하는지 확인해요.

> [!NOTE]
> hook은 새 세션부터 확실히 적용돼요. init 뒤에는 Claude Code를 다시 열어 주세요.

적용이 끝난 프로젝트는 이런 모습이에요.

```text
my-app/
├─ .sonic-harness/        원본이 관리하는 파일 (update로 갱신)
│  ├─ harness.md
│  ├─ eslint.base.mjs, prettier.base.mjs, commitlint.base.mjs
│  ├─ tsconfig.strict.json
│  └─ lock.json           받은 버전과 파일별 해시
├─ eslint.config.mjs      프로젝트 소유: base + 이 프로젝트만의 규칙
├─ CLAUDE.md              @.sonic-harness/harness.md 를 불러와요
└─ src/                   app · pages · widgets · features · entities · shared
```

## 명령어

| 명령어                      | 하는 일                                                              | 승인              |
| --------------------------- | -------------------------------------------------------------------- | ----------------- |
| `/sonic-harness:init`       | 이 프로젝트에 최신 하네스를 적용해요                                 | 시작 전           |
| `/sonic-harness:status`     | 적용 버전, 원본의 새 변경, 프로젝트에서 고친 하네스 파일을 보여 줘요 | 없음              |
| `/sonic-harness:update`     | 최신 규칙을 받아요. 프로젝트에서 고친 파일은 덮어쓰지 않고 합쳐요    | 적용 전, 충돌마다 |
| `/sonic-harness:check`      | 마지막 점검 뒤 받은 규칙 변경을 코드가 지키는지 점검해요             | 고치기 전         |
| `/sonic-harness:contribute` | 프로젝트에서 고친 공통 규칙을 이 저장소에 PR로 올려요                | 브랜치 전, PR 전  |

평소 흐름은 다음과 같아요.

- **새 프로젝트**: `init`
- **진행 중**: `status` → `update` → `check`
- **공통 규칙을 고쳤을 때**: `.sonic-harness/` 파일 수정 → `contribute` → PR 병합 → 다른 프로젝트에서 `update`

> [!IMPORTANT]
> `.sonic-harness/` 파일은 공통 규칙을 바꿀 때만 고쳐요. 이 프로젝트에만 필요한 규칙은 프로젝트 `eslint.config.mjs`나 `CLAUDE.md`에 둬요.

### sonic-ui와 함께 쓰기

```bash
npm i @xonic0506/sonic-ui
```

프로젝트 `eslint.config.mjs`에서 `sonicDesign` 주석 두 줄을 풀면 디자인 lint가 켜져요. `CLAUDE.md`는 init이 이미 sonic-ui 문서까지 불러오게 만들어 둬요.

## 동작 방식

Claude가 파일을 쓰면 두 hook이 차례로 실행돼요.

```text
Write src/entities/user/ui/UserBadge.tsx
 ├─ PreToolUse   경로가 kebab-case가 아니면 exit 2 → 쓰기 취소, 이유를 Claude에게 전달
 └─ PostToolUse  prettier --write → eslint --fix → 남은 에러가 있으면 exit 2 → Claude가 다시 고침
```

`update`는 파일마다 `lock.json`의 해시와 비교해 결정해요.

| 원본   | 프로젝트 | 결과                                                          |
| ------ | -------- | ------------------------------------------------------------- |
| 바뀜   | 그대로   | 새 원본으로 바꿔요                                            |
| 그대로 | 바뀜     | 프로젝트 파일을 그대로 둬요                                   |
| 바뀜   | 바뀜     | 이전 원본·새 원본·프로젝트 파일을 나란히 두고 Claude가 합쳐요 |

전체 규칙과 예시 코드는 [`rules/harness.md`](./rules/harness.md)에 있어요.

## 규칙 바꾸기

이 저장소의 구조는 다음과 같아요.

```text
.claude-plugin/marketplace.json  플러그인 목록 (source: ./plugin)
plugin/                          명령어 5개, hooks, scripts/harness.mjs
rules/                           프로젝트 .sonic-harness/로 들어가는 파일
templates/                       init 때 없는 파일만 복사하는 시작 파일
tests/lint-samples/              ESLint 규칙 테스트
evals/                           Claude 행동 평가 (hook·init 확인, 기준 작업 3개)
```

규칙을 바꿀 때는 이 순서를 따라요.

1. `tests/lint-samples`에 규칙을 어기는 샘플(첫 줄 `// expect: 규칙`)과 지키는 샘플을 추가하고 `npm run test:lint`를 실행해요.
2. `rules/CHANGELOG.md`에 한 줄을 써요.
3. `evals/run.sh`로 기준 작업을 다시 돌리고 `evals/results/`의 이전 결과와 비교해요.
4. 명령어나 hook을 바꿨다면 `plugin/.claude-plugin/plugin.json`의 `version`을 올려요.

<details>
<summary>평가 스크립트</summary>

| 스크립트                 | 확인하는 것                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `evals/setup-sandbox.sh` | 평가용 Vite 프로젝트(`sandbox/vite`)를 플러그인 스크립트로 새로 만들어요                       |
| `evals/hook-check.sh`    | 규칙을 어긴 파일을 hook이 막고, 최종 파일이 lint를 통과하는지 확인해요                         |
| `evals/init-check.sh`    | 새 Next.js 프로젝트에서 `/sonic-harness:init`만으로 lint·typecheck·build가 통과하는지 확인해요 |
| `evals/run.sh [작업]`    | 기준 작업 3개를 [`evals/checklist.md`](./evals/checklist.md)로 채점해요                        |

평가는 개인 전역 설정 없이 이 저장소의 플러그인만 얹어서 실행해요.

</details>

<details>
<summary>환경 변수</summary>

| 변수                   | 기본값                                              | 쓰임                                                           |
| ---------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| `SONIC_HARNESS_ORIGIN` | `https://github.com/sonic0506/sonic-harness-fe.git` | 원본 git URL이에요. 테스트할 때는 로컬 경로를 넣어요           |
| `SONIC_HARNESS_HOME`   | `~/.sonic-harness`                                  | 원본 clone 위치예요. `contribute`가 여기에서 브랜치를 만들어요 |

</details>

## FAQ

<details>
<summary>init 뒤에도 hook이 동작하지 않아요</summary>

Claude Code는 세션을 시작할 때 플러그인 hook을 읽어요. Claude Code를 다시 열고, 프로젝트 루트에 `.sonic-harness/lock.json`이 있는지 확인하세요.

</details>

<details>
<summary>Next.js에서 init 뒤 typecheck가 실패해요</summary>

라우팅 파일을 `src/app`에서 루트 `app/`으로 옮기면 `.next/types`에 옛 경로가 남아 있을 수 있어요. `npx next build`를 한 번 실행하면 다시 만들어져요.

</details>

<details>
<summary>update에서 충돌이 났어요</summary>

프로젝트와 원본이 같은 하네스 파일을 둘 다 고친 경우예요. `/sonic-harness:update`가 `<파일>.base`(이전 원본), `<파일>.incoming`(새 원본), 프로젝트 파일을 비교해 합친 내용을 제안하고, 확인을 받은 뒤 정리해요.

</details>

<details>
<summary>contribute가 "원본에서도 바뀌었어요"라며 멈춰요</summary>

올리려는 파일이 원본에서도 바뀐 상태예요. 먼저 `/sonic-harness:update`로 받아 합친 뒤 다시 실행하세요.

</details>

<details>
<summary>Prettier 기본값이 궁금해요</summary>

`singleQuote: true`, `semi: true`, `tabWidth: 2`, `trailingComma: 'all'`, `printWidth: 80`이에요. 기본값을 바꾼 update를 받은 뒤에는 `npm run format`을 한 번 실행하세요.

</details>
