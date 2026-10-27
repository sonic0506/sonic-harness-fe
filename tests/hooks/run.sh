#!/usr/bin/env bash
# hook 점검: 임시 모노레포(apps/web만 하네스 적용, node_modules는 루트로 끌어올림)에 hook을 직접 돌려요.
#   bash tests/hooks/run.sh
set -uo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
hook="$here/plugin/hooks/format-lint.sh"
tmp=$(cd "$(mktemp -d)" && pwd -P)
trap 'rm -rf "$tmp"' EXIT
fail=0
check() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "FAIL $1 (기대 $3, 실제 $2)"; fail=1; }; }

app="$tmp/apps/web"
mkdir -p "$app/.sonic-harness" "$app/src" "$tmp/apps/other/src"
echo '{}' >"$app/.sonic-harness/lock.json"
ln -s "$here/node_modules" "$tmp/node_modules"

pre() { jq -n --arg f "$2" '{hook_event_name:"PreToolUse",tool_input:{file_path:$f}}' | CLAUDE_PROJECT_DIR="$1" "$hook" 2>/dev/null; echo $?; }
check '모노레포: 앱 src의 PascalCase 파일을 막음' "$(pre "$tmp" "$app/src/UserBadge.tsx")" 2
check '모노레포: 앱 src의 kebab-case 파일은 통과' "$(pre "$tmp" "$app/src/user-badge.tsx")" 0
check '모노레포: lock 없는 앱은 건너뜀' "$(pre "$tmp" "$tmp/apps/other/src/UserBadge.tsx")" 0
check '단일 프로젝트: 지금처럼 막음' "$(pre "$app" "$app/src/UserBadge.tsx")" 2
check '..이 들어간 경로는 건너뜀' "$(pre "$tmp" "$app/../web/src/UserBadge.tsx")" 0

echo '{"a":1}' >"$app/a.json"
jq -n --arg f "$app/a.json" '{hook_event_name:"PostToolUse",tool_input:{file_path:$f}}' | CLAUDE_PROJECT_DIR="$tmp" "$hook"
check '모노레포: 루트로 끌어올린 prettier로 format' "$(cat "$app/a.json")" '{ "a": 1 }'

exit $fail
