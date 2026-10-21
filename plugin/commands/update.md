---
description: 원본의 최신 하네스 규칙 받기 (프로젝트에서 고친 파일은 합치기)
allowed-tools: Bash(node:*), Bash(npm:*), Read, Edit, Write
---

스크립트: `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs"`

## 받을 변경 (계획)

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs" update 2>&1 || true`

## 순서

1. 위 계획을 한국어로 정리해요. "최신"뿐이면 받을 게 없다고 알리고 끝내요.
   - 합치는 중인 파일이 있다는 에러면 5번(합치기)부터 이어서 해요.
2. 변경 기록을 보고 어떤 규칙이 바뀌는지 한두 줄로 설명하고, **적용할지 사용자 확인을 받아요**.
3. `harness.mjs update --apply`를 실행해요.
   - "원본에서 바뀐 템플릿"은 이렇게 처리해요. **갱신**은 스크립트가 이미 새 원본으로 바꿨어요. **합치기 필요**는 적용 출력의 diff를 그 프로젝트 파일에 반영해요(프로젝트에서 고친 부분은 남겨요). 바꾼 내용을 보여 준 뒤 `harness.mjs template-merged <경로>`를 실행해요. 손으로 최소한만 고치지 말고 diff에 있는 변경을 모두 반영해요.
   - 계획에 "프로젝트에 없는 패키지"가 있으면 적용 뒤 그 명령(`npm i -D …`, `npm i …`)을 그대로 실행해요. 새 규칙이 쓰는 ESLint 플러그인이라 설치하지 않으면 lint가 깨져요.
   - 계획에 "새 템플릿"이 있으면 무엇을 하는 파일인지 한 줄씩 설명하고, **어떤 것을 추가할지 물어요**. 고른 것만 `harness.mjs add-templates <경로...>`로 복사해요. `(필수: …가 불러와요)`가 붙은 새 템플릿은 바뀐 템플릿이 import하는 파일이라 빼면 빌드가 깨져요. 그렇다고 알리고 함께 추가하길 권해요. 고르지 않은 템플릿은 다음 update에서 다시 묻지 않아요.
   - `.husky/pre-commit`이나 `lint-staged.config.mjs`를 추가했으면 `npm i -D lint-staged@17`을 실행해요. `.github/workflows/ci.yml`을 추가했으면 `package.json`에 `build` 스크립트가 있는지 확인해요.
4. 충돌이 없으면 6번으로 가요.
5. 충돌 파일마다(`.sonic-harness/<파일>`):
   - `<파일>.base`(이전 원본), `<파일>.incoming`(새 원본), `<파일>`(프로젝트)을 읽어요.
   - 원본의 새 변경을 받아들이면서 프로젝트에서 고친 부분을 남기는 합친 내용을 만들어 **diff를 보여 주고 확인을 받아요**.
   - `.sonic-harness/<파일>`에 저장하고 `harness.mjs resolve <파일>`을 실행해요.
   - 프로젝트에 남긴 차이는 나중에 `/sonic-harness:contribute`로 원본에 올릴 수 있다고 알려요.
6. `npm run lint -- --fix`를 한 번 실행해요. import 순서처럼 자동으로 고칠 수 있는 것만 고쳐져요. 고친 파일 목록을 보여 주고, 그다음 `npm run lint`와 `npm run typecheck`를 실행해 남은 결과만 알려요(남은 것은 고치지 않아요).
7. 받은 규칙으로 기존 코드를 점검하려면 `/sonic-harness:check`를 실행하라고 안내해요(update를 여러 번 해도 check는 마지막 점검 뒤 변경을 모두 봐요).
