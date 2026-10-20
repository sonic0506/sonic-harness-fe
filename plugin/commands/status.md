---
description: 하네스 상태 보기 (적용 버전, 원본의 새 변경, 프로젝트에서 고친 하네스 파일)
allowed-tools: Bash(node:*)
---

## 상태

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs" status 2>&1`

## 할 일

위 결과를 한국어 해요체로 짧게 정리해 주세요. 파일은 고치지 않아요.

- 원본에 새 변경이 있으면 `/sonic-harness:update`를 권해요.
- 프로젝트에서 고친 하네스 파일이 있으면, 공통으로 쓸 규칙인지 물어보고 `/sonic-harness:contribute`를 권해요.
- 합치는 중인 파일이 있으면 `/sonic-harness:update`를 다시 실행해 마무리하라고 알려요.
- 하네스가 없다는 에러면 `/sonic-harness:init`을 권해요.
