---
description: 마지막 점검 뒤 받은 규칙 변경을 현재 코드가 지키는지 점검 (고치기는 승인 후)
allowed-tools: Bash(node:*), Bash(npm:*), Bash(npx:*), Read, Grep, Glob, Edit, Write
---

스크립트: `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs"`

## 바뀐 규칙

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.mjs" check-diff 2>&1 || true`

## 순서

판단은 파일을 근거로 해요. CI에서 무엇이 어떻게 도는지는 `.github/workflows/ci.yml`을, 스크립트는 `package.json`을 읽고 말해요. 읽지 않은 것을 예측해서 말하지 않아요.

1. 받은 규칙 변경이 없다고 나오면, `.sonic-harness/harness.md` 전체로 점검할지 물어요. 원하지 않으면 끝내요.
2. 바뀐 규칙을 두 종류로 나눠요.
   - **도구로 잡히는 규칙**(`eslint.base.mjs`, `tsconfig.strict.json`, `prettier.base.mjs` 변경): `npm run lint`, `npm run typecheck`, `npx prettier --check .`을 실행해 위반을 모아요.
   - **문서로만 있는 규칙**(`harness.md` 변경): 바뀐 문장마다 관련 코드를 Grep/Read로 찾아 직접 확인해요. 근거로 파일:줄을 남겨요.
3. 결과를 보여 줘요. 위반마다 파일:줄, 어긴 규칙, 고칠 방법을 쓰고, 끝에 고칠 계획을 정리해요. 위반이 없으면 그렇게 알리고 `harness.mjs checked`를 실행한 뒤 끝내요.
4. **여기서 멈추고 사용자 승인을 받아요.** 전부 고칠지, 일부만 고칠지, 그만둘지 물어요. 승인 전에는 아무 파일도 고치지 않아요.
5. 승인받은 것만 고쳐요. 규칙을 끄는 주석(`eslint-disable`, `@ts-ignore`)은 쓰지 않아요.
6. 다시 `npm run lint`, `npm run typecheck`, `npm test`를 실행해 결과를 알려요.
7. 남은 위반이 없거나 사용자가 남은 위반을 그대로 두기로 했으면 `harness.mjs checked`를 실행해 점검을 기록해요. 그대로 둔 위반은 목록으로 남겨 줘요.
