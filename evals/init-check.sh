#!/usr/bin/env bash
# /sonic-harness:init 명령 확인: 새 Next.js 프로젝트에서 Claude가 init을 끝까지 하고,
# lint·typecheck·build가 통과하는지 봐요. 원본은 이 저장소의 커밋된 상태예요.
#   evals/init-check.sh
set -uo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
app="$here/sandbox/next-init-$(date +%H%M%S)"
log="$here/evals/results/init-check-$(date +%Y%m%d-%H%M%S).jsonl"
mkdir -p "$here/evals/results" "$here/sandbox"
export SONIC_HARNESS_ORIGIN="$here" SONIC_HARNESS_HOME="$here/sandbox/.harness-home"

cd "$here/sandbox" && npx --yes create-next-app@16 "$(basename "$app")" --ts --app --src-dir --no-tailwind --no-eslint \
  --use-npm --import-alias "@/*" --yes </dev/null >/dev/null 2>&1
cd "$app" && git init -q -b main

claude -p "/sonic-harness:init 평가 실행이라 사용자 확인 단계는 모두 승인된 것으로 보고 끝까지 진행해 주세요." \
  --model sonnet --permission-mode acceptEdits --setting-sources project,local --strict-mcp-config \
  --plugin-dir "$here/plugin" --allowedTools "Bash(node:*)" "Bash(npm:*)" "Bash(npx:*)" "Bash(git:*)" "Bash(ls:*)" "Bash(mv:*)" "Bash(mkdir:*)" \
  --output-format stream-json --verbose >"$log" 2>&1
if grep -q 'Failed to authenticate' "$log"; then
  echo "claude 인증이 만료됐어요. 터미널에서 claude를 실행해 /login 한 뒤 다시 실행하세요."; exit 1
fi

ok=0
check() { if eval "$2" >/dev/null 2>&1; then echo "  ✅ $1"; else echo "  ❌ $1"; ok=1; fi; }
echo "init-check: $app"
check "lock.json 있음" "test -f .sonic-harness/lock.json"
check "CLAUDE.md가 harness.md를 불러옴" "grep -q '@.sonic-harness/harness.md' CLAUDE.md"
check "eslint.config.mjs가 base를 불러옴" "grep -q '.sonic-harness/eslint.base.mjs' eslint.config.mjs"
check "라우팅 app/이 루트에 있음" "test -f app/layout.tsx && test -f app/page.tsx"
check "src/app에 라우팅 파일 없음" "! test -e src/app/layout.tsx"
check "npm run lint" "npm run lint"
check "npm run typecheck" "npm run typecheck"
check "next build" "npx next build"
echo "로그: $log"
[ $ok = 0 ] && echo "결과: PASS" || echo "결과: FAIL"
