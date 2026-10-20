# sonic-harness-fe

React + TypeScript(Vite, Next.js) 프로젝트에 쓰는 개인 코딩 하네스예요. Claude Code 플러그인 `sonic-harness`로 설치하고, 규칙은 글보다 도구로 강제해요.

| 층        | 무엇                                                                                        | 하는 일                                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 도구      | `rules/eslint.base.mjs`, `prettier.base.mjs`, `tsconfig.strict.json`, `commitlint.base.mjs` | FSD 레이어 경계, 이름, import 제한, strict TS, 커밋 형식                                                                                                                                    |
| hooks     | `plugin/hooks/`                                                                             | Claude가 파일을 쓰기 전 경로(kebab-case)를 검사하고, 쓴 뒤 Prettier + `eslint --fix`를 실행해요. 남은 에러는 Claude에게 돌려줘요. `.sonic-harness/lock.json`이 있는 프로젝트에서만 동작해요 |
| 규칙 문서 | `rules/harness.md`                                                                          | 규칙과 예시. 혼자 읽어도 완결돼요                                                                                                                                                           |

디자인 규칙(DESIGN.md, sonic-ui 사용)은 다루지 않아요. sonic-ui의 디자인 lint는 프로젝트 `eslint.config.mjs`에서 주석 두 줄을 풀어 켜요.

## 설치

```
/plugin marketplace add sonic0506/sonic-harness-fe
/plugin install sonic-harness@sonic-harness
```

## 명령어

| 명령어                      | 하는 일                                                                                | 승인              |
| --------------------------- | -------------------------------------------------------------------------------------- | ----------------- |
| `/sonic-harness:init`       | 원본 최신 규칙을 `.sonic-harness/`에 받고, 템플릿·패키지·tsconfig·CLAUDE.md를 설정해요 | 시작 전           |
| `/sonic-harness:status`     | 적용 버전, 원본의 새 변경, 프로젝트에서 고친 하네스 파일을 보여 줘요                   | 없음(읽기만)      |
| `/sonic-harness:update`     | 최신 규칙을 받아요. 프로젝트에서 고친 파일은 합쳐요                                    | 적용 전, 충돌마다 |
| `/sonic-harness:check`      | 마지막 update로 바뀐 규칙을 코드가 지키는지 점검해요                                   | 고치기 전         |
| `/sonic-harness:contribute` | 프로젝트에서 고친 공통 규칙을 이 저장소에 PR로 올려요                                  | 브랜치 전, PR 전  |

```
새 프로젝트          init
진행 중              status → update → check
공통 규칙을 고쳤을 때  contribute(PR) → 합쳐짐 → 다른 프로젝트에서 update
```

## 프로젝트 안의 구조

```
my-app/
├─ .sonic-harness/          하네스 원본이 관리 (update로 갱신, 고치면 contribute 대상)
│  ├─ harness.md, eslint.base.mjs, prettier.base.mjs, commitlint.base.mjs, tsconfig.strict.json
│  └─ lock.json             받은 버전(원본 커밋)과 파일별 해시
├─ eslint.config.mjs        프로젝트 소유: base + sonicDesign + 이 프로젝트만의 규칙
├─ prettier.config.mjs, commitlint.config.mjs   base를 다시 내보내기만 해요
├─ tsconfig(.app).json      "extends": "./.sonic-harness/tsconfig.strict.json"
└─ CLAUDE.md                @.sonic-harness/harness.md + sonic-ui 문서 + 이 프로젝트 정보
```

`lock.json`에 받을 때의 해시가 있어서, 원본이 바뀐 것과 프로젝트에서 고친 것을 구분해요. 그래서 update는 고치지 않은 파일만 바꾸고, 둘 다 바뀐 파일은 합치기를 요청해요.

## 이 저장소

```
.claude-plugin/marketplace.json   플러그인 목록 (source: ./plugin)
plugin/                           플러그인: commands/ 5개, hooks/, scripts/harness.mjs
rules/                            프로젝트 .sonic-harness/로 들어가는 파일 + CHANGELOG.md
templates/                        init 때 없는 파일만 복사하는 시작 파일
tests/lint-samples/               ESLint 규칙 테스트 (bad 파일 첫 줄 // expect: 규칙)
evals/                            Claude 행동 평가 (hook-check, 기준 작업 3개, 체크리스트, 결과)
```

규칙을 바꿀 때(직접 고치거나 contribute PR을 검토할 때):

1. `tests/lint-samples`에 bad/good 샘플을 추가하고 `npm run test:lint`를 실행해요.
2. `rules/CHANGELOG.md`에 한 줄을 써요.
3. `evals/run.sh`로 회귀를 확인하고 `evals/results/`의 이전 결과와 비교해요.
4. 명령어나 hook을 바꿨다면 `plugin/.claude-plugin/plugin.json`의 version을 올려요.

환경 변수: `SONIC_HARNESS_ORIGIN`(원본 git URL, 테스트용 로컬 경로 가능), `SONIC_HARNESS_HOME`(원본 clone 위치, 기본 `~/.sonic-harness`).
