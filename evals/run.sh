#!/usr/bin/env bash
# 기준 작업 실행: 작업마다 sandbox를 시작 커밋(main)으로 되돌리고 Claude에게 작업을 시킨 뒤,
# 자동 항목을 확인해 evals/results/<날짜>-<작업>.md를 남겨요. 수동 항목은 그 파일에서 체크해요.
#   evals/run.sh            # 전체
#   evals/run.sh 02         # 이름에 02가 들어간 작업만
#   MODEL=opus evals/run.sh # 모델 바꾸기 (기본 sonnet)
set -uo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
app=${SANDBOX:-$here/sandbox/vite}
stamp=$(date +%Y%m%d-%H%M)
mkdir -p "$here/evals/results"
cd "$app" || { echo "sandbox가 없어요: $app (README의 'sandbox 만들기' 참고)"; exit 1; }

for task in "$here"/evals/tasks/*${1:-}*.md; do
  name=$(basename "$task" .md)
  out="$here/evals/results/$stamp-$name.md"
  log="$here/evals/results/$stamp-$name.jsonl"
  echo "▶ $name"
  git checkout -q main && git checkout -q . && git clean -fdq src e2e

  hooklog="${log%.jsonl}.hooks.log"
  : >"$hooklog"
  # 전역 설정·플러그인·MCP 없이, 이 저장소의 플러그인(plugin/)만 얹어서 실행해요.
  HARNESS_HOOK_LOG="$hooklog" claude -p "$(cat "$task")" --model "${MODEL:-sonnet}" --permission-mode acceptEdits \
    --setting-sources project,local --strict-mcp-config --plugin-dir "$here/plugin" \
    --allowedTools "Bash(npm run *)" "Bash(npm test*)" "Bash(npx vitest*)" "Bash(npx eslint*)" "Bash(npx tsc*)" \
    --output-format stream-json --verbose > "$log" 2>&1
  if grep -q 'Failed to authenticate' "$log"; then
    echo "  claude 인증이 만료됐어요. 터미널에서 claude를 실행해 /login 한 뒤 다시 실행하세요."; exit 1
  fi

  check() { if eval "$2" >/dev/null 2>&1; then echo "| $1 | ✅ |"; else echo "| $1 | ❌ |"; fi; }
  {
    echo "# $name ($stamp, ${MODEL:-sonnet})"
    echo
    echo "## 자동 확인"
    echo
    echo "| 항목 | 결과 |"
    echo "|---|---|"
    check "1 lint" "npm run lint"
    check "2 typecheck" "npm run typecheck"
    check "3 test (테스트 파일 있음)" "find src -name '*.test.ts*' | grep -q . && npm test"
    check "4 eslint-disable·ts-ignore·any 없음" "! grep -rnE 'eslint-disable|@ts-ignore|: any\\b' src"
    check "5 useQuery 없음" "! grep -rnE '\\buseQuery\\(' src"
    # 조회(useSuspenseQuery)가 있을 때만: 그걸 감싸는 Suspense·ErrorBoundary가 pages/widgets에 있어야 해요
    check "6 조회가 있으면 pages/widgets에 Suspense·ErrorBoundary" "! grep -rq useSuspenseQuery src || { grep -rq '<Suspense' src/pages src/widgets && grep -rq 'ErrorBoundary' src/pages src/widgets; }"
    check "13 fetch는 shared/api에만" "! grep -rln 'fetch(' src --include=*.ts --include=*.tsx | grep -v '^src/shared/api/'"
    echo
    echo "## 수동 확인 (checklist.md 7–12, 14–15 + 작업별)"
    echo
    for i in "7 MSW handler, 정상·빈/실패 테스트" "8 폴더 위치" "9 계층 분리" "10 이름 규칙" "11 빈 상태 처리" "12 불필요한 것 없음" "14 쿼리 팩토리" "15 상태 위치" "작업별 항목"; do
      echo "- [ ] $i"
    done
    echo
    echo "## hook이 막은 기록 ($(wc -l <"$hooklog" | tr -d ' ')회)"
    echo
    echo '```'
    cat "$hooklog"
    echo '```'
    echo
    echo "## 만든 파일"
    echo
    echo '```'
    git status --porcelain --untracked-files=all
    echo '```'
    echo
    echo "결과 코드: sandbox 브랜치 \`eval/$stamp-$name\` · 로그: \`$(basename "$log")\`"
  } > "$out"

  git checkout -q -b "eval/$stamp-$name" && git add -A &&
    git -c user.name=eval -c user.email=eval@local commit -qm "eval: $name" --no-verify
  git checkout -q main
  grep -E '❌|✅' "$out" | sed 's/^/  /'
done
echo "결과: $here/evals/results/$stamp-*.md"
