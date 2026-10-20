---
description: 원본의 최신 하네스 규칙 받기 (프로젝트에서 고친 파일은 합치기)
allowed-tools: Bash(node:*), Bash(npm:*), Read, Edit, Write
---

스크립트: `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs"`

## 받을 변경 (계획)

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs" update 2>&1`

## 순서

1. 위 계획을 한국어로 정리해요. "최신"뿐이면 받을 게 없다고 알리고 끝내요.
   - 합치는 중인 파일이 있다는 에러면 5번(합치기)부터 이어서 해요.
2. 변경 기록을 보고 어떤 규칙이 바뀌는지 한두 줄로 설명하고, **적용할지 사용자 확인을 받아요**.
3. `harness.mjs update --apply`를 실행해요.
4. 충돌이 없으면 6번으로 가요.
5. 충돌 파일마다(`.sonic-harness/<파일>`):
   - `<파일>.base`(이전 원본), `<파일>.incoming`(새 원본), `<파일>`(프로젝트)을 읽어요.
   - 원본의 새 변경을 받아들이면서 프로젝트에서 고친 부분을 남기는 합친 내용을 만들어 **diff를 보여 주고 확인을 받아요**.
   - `.sonic-harness/<파일>`에 저장하고 `harness.mjs resolve <파일>`을 실행해요.
   - 프로젝트에 남긴 차이는 나중에 `/sonic-harness:contribute`로 원본에 올릴 수 있다고 알려요.
6. `npm run lint`와 `npm run typecheck`를 실행해 결과만 알려요(고치지 않아요).
7. 새 규칙으로 기존 코드를 점검하려면 `/sonic-harness:check`를 실행하라고 안내해요.
