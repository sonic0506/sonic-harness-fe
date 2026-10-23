#!/usr/bin/env bash
# /sonic-harness:init 명령 확인: 새 프로젝트에서 Claude가 init을 끝까지 하고,
# lint·typecheck·build가 통과하는지 봐요. 원본은 이 저장소의 커밋된 상태예요.
#   evals/init-check.sh [next|vite] [y|n]   (기본 next n. y는 디자인 시스템(sonic-ui) 질문에 Y로 답해요)
# next y는 Tailwind가 이미 있는 프로젝트, vite y는 init이 Tailwind를 새로 설치하는 프로젝트예요.
set -uo pipefail
kind=${1:-next} design=${2:-n}
here=$(cd "$(dirname "$0")/.." && pwd)
app="$here/sandbox/$kind-init-$design-$(date +%H%M%S)"
log="$here/evals/results/init-check-$kind-$design-$(date +%Y%m%d-%H%M%S).jsonl"
mkdir -p "$here/evals/results" "$here/sandbox"
export SONIC_HARNESS_ORIGIN="$here" SONIC_HARNESS_HOME="$here/sandbox/.harness-home-$kind-$design"

cd "$here/sandbox"
if [ "$kind" = next ]; then
  tw=$([ "$design" = y ] && echo --tailwind || echo --no-tailwind)
  npx --yes create-next-app@16 "$(basename "$app")" --ts --app --src-dir "$tw" --no-eslint \
    --use-npm --import-alias "@/*" --yes </dev/null >/dev/null 2>&1
else
  npm create vite@9 "$(basename "$app")" -- --template react-ts --no-interactive </dev/null >/dev/null 2>&1
  (cd "$app" && npm i --silent >/dev/null 2>&1)
fi
cd "$app" && git init -q -b main

answer=$([ "$design" = y ] && echo Y || echo N)
claude -p "/sonic-harness:init 평가 실행이라 사용자 확인 단계는 모두 승인된 것으로 보고 끝까지 진행해 주세요. 디자인 시스템(sonic-ui)을 쓰는지 묻는 질문에는 $answer로 답한 것으로 봐요." \
  --model sonnet --permission-mode acceptEdits --setting-sources project,local --strict-mcp-config \
  --plugin-dir "$here/plugin" --allowedTools "Bash(node:*)" "Bash(npm:*)" "Bash(npx:*)" "Bash(git:*)" "Bash(ls:*)" "Bash(mv:*)" "Bash(mkdir:*)" "Bash(rm:*)" \
  --output-format stream-json --verbose >"$log" 2>&1
if grep -q 'Failed to authenticate' "$log"; then
  echo "claude 인증이 만료됐어요. 터미널에서 claude를 실행해 /login 한 뒤 다시 실행하세요."; exit 1
fi

ok=0
check() { if eval "$2" >/dev/null 2>&1; then echo "  ✅ $1"; else echo "  ❌ $1"; ok=1; fi; }
css=$([ "$kind" = next ] && echo app/globals.css || echo src/app/styles/index.css)
echo "init-check ($kind, 디자인 시스템 $answer): $app"
check "lock.json 있음" "test -f .sonic-harness/lock.json"
check "CLAUDE.md가 harness.md를 불러옴" "grep -q '@.sonic-harness/harness.md' CLAUDE.md"
check "eslint.config.mjs가 base를 불러옴" "grep -q '.sonic-harness/eslint.base.mjs' eslint.config.mjs"
if [ "$kind" = next ]; then
  check "라우팅 app/이 루트에 있음" "test -f app/layout.tsx && test -f app/page.tsx"
  check "src/app에 라우팅 파일 없음" "! test -e src/app/layout.tsx"
else
  check "App이 src/app/app.tsx에 있음" "test -f src/app/app.tsx && ! test -e src/App.tsx"
fi
if [ "$design" = y ]; then
  check "lock에 designSystem: true" "grep -q '\"designSystem\": true' .sonic-harness/lock.json"
  check "sonic-ui를 ^ 범위로 설치" "grep -q '\"@xonic0506/sonic-ui\": \"\\^' package.json"
  check "CLAUDE.md가 DESIGN.md·AI-RULES.md를 불러옴" "grep -q 'sonic-ui/DESIGN.md' CLAUDE.md && grep -q 'sonic-ui/AI-RULES.md' CLAUDE.md"
  check "eslint.config.mjs에서 sonicDesign이 켜짐" "grep -q '^import sonicDesign' eslint.config.mjs && grep -qE '^\s*sonicDesign,' eslint.config.mjs"
  check "전역 CSS가 sonic-ui styles.css를 불러옴" "grep -q '@xonic0506/sonic-ui/styles.css' $css"
  check "글꼴을 fontsource로 불러옴" "grep -q '@fontsource/ibm-plex-sans-kr' $css && ! grep -rqE 'from .next/font' app src"
  check "Tailwind layer 순서와 tailwind.css" "grep -q '@layer theme, base, sonic, components, utilities' $css && grep -q '@xonic0506/sonic-ui/tailwind.css' $css"
  check "앱 루트에 isolate" "grep -rqE 'isolate|isolation' app src"
else
  check "lock에 designSystem: false" "grep -q '\"designSystem\": false' .sonic-harness/lock.json"
  check "sonic-ui를 설치하지 않음" "! grep -q '@xonic0506/sonic-ui' package.json"
  check "CLAUDE.md가 sonic-ui 문서를 불러오지 않음" "! grep -q '@node_modules/@xonic0506/sonic-ui' CLAUDE.md"
fi
check "npm run lint" "npm run lint"
check "npm run typecheck" "npm run typecheck"
if [ "$kind" = next ]; then check "next build" "npx next build"; else check "vite build" "npx vite build"; fi
echo "로그: $log"
[ $ok = 0 ] && echo "결과: PASS" || echo "결과: FAIL"
