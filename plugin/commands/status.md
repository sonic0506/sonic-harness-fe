---
description: 하네스 상태 보기 (적용 버전, 원본의 새 변경, 프로젝트에서 고친 하네스 파일)
allowed-tools: Bash(node:*)
---

## 상태

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs" status 2>&1 || true`

## 할 일

위 결과를 한국어 해요체로 짧게 정리해 주세요. 파일은 고치지 않아요.

- 원본에 새 변경이 있으면 `/sonic-harness:update`를 권해요.
- "아직 올리지 않음"인 하네스 파일이 있으면, 공통으로 쓸 규칙인지 물어보고 `/sonic-harness:contribute`를 권해요. 이 프로젝트에만 필요한 규칙이면 프로젝트 `eslint.config.mjs`(또는 `CLAUDE.md`)로 옮기자고 제안해요.
- "PR 진행 중"인 파일은 PR 주소를 알려 주고, PR이 합쳐진 뒤 `/sonic-harness:update`로 받으면 정리된다고 안내해요. contribute를 다시 권하지 않아요.
- 참고: 고친 하네스 파일은 update 때 덮어쓰지 않아요. 원본도 바뀌었으면 합치기를 물어봐요.
- 합치는 중인 파일이 있으면 `/sonic-harness:update`를 다시 실행해 마무리하라고 알려요.
- 하네스가 없다는 에러면 `/sonic-harness:init`을 권해요.
