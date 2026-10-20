---
description: 프로젝트에서 고친 공통 하네스 규칙을 원본 저장소에 PR로 올리기
allowed-tools: Bash(node:*), Bash(git:*), Bash(gh:*), Bash(npm:*), Read, Edit, Write
---

스크립트: `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs"`
원본 clone: `~/.sonic-harness/origin` (스크립트가 만들고 관리해요)

## 프로젝트에서 고친 하네스 파일

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs" contribute-diff 2>&1`

## 순서

1. 고친 파일이 없으면 알리고 끝내요. "원본에서도 바뀌었어요" 경고가 있으면 `/sonic-harness:update`부터 하라고 안내하고 끝내요.
2. diff를 한국어로 설명해요. **공통 규칙만** 올려요. 이 프로젝트에만 맞는 내용(도메인 이름, 이 프로젝트의 API, 특정 라이브러리 예외)이 섞여 있으면 짚어 주고, 그건 프로젝트 `eslint.config.mjs`나 `CLAUDE.md`로 옮기자고 제안해요.
3. 올릴 파일과 브랜치 이름(`harness/<짧은-설명>`)을 정하고 **사용자 확인을 받아요**.
4. `harness.mjs contribute-start <브랜치> <파일...>`을 실행해요.
5. 원본 clone(`~/.sonic-harness/origin`)에서:
   - `rules/CHANGELOG.md`의 맨 위 목록에 `- YYYY-MM-DD: 무엇이 왜 바뀌었는지`를 한 줄 추가해요.
   - `eslint.base.mjs`를 바꿨다면 `tests/lint-samples/src`에 그 규칙을 어기는 샘플(첫 줄 `// expect: 규칙`)과 지키는 샘플을 추가해요.
   - `harness.md`의 규칙을 바꿨다면 `evals/checklist.md`에 관련 항목이 있는지 보고 필요하면 고쳐요.
6. `harness.mjs contribute-finish "<Conventional Commits 형식 한국어 메시지>"`를 실행해요. lint 샘플 테스트가 실패하면 고쳐서 다시 실행해요.
7. PR 본문을 임시 파일(예: `~/.sonic-harness/pr-body.md`)에 써요. 무엇을, 왜, 어느 프로젝트에서 필요했는지, 테스트 결과를 담아요. 마지막 줄은 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`예요.
8. 제목과 본문을 보여 주고 **PR을 올릴지 사용자 확인을 받아요**.
9. `harness.mjs contribute-push "<제목>" <본문 파일>`을 실행하고 PR 주소를 알려요.
10. PR이 합쳐지면 이 프로젝트와 다른 프로젝트에서 `/sonic-harness:update`로 받는다고 안내해요.
