#!/usr/bin/env bash
# PreToolUse(Write):            src/ 아래 새 파일 경로가 kebab-case가 아니면 쓰기 전에 막아요.
# PostToolUse(Edit|Write|...):  수정한 파일에 prettier → eslint --fix. 남은 에러는 exit 2로 Claude에게 돌려줘요.
# HARNESS_HOOK_LOG가 있으면 막은 기록을 남겨요(evals에서 사용).
input=$(cat)
f=$(jq -r '.tool_input.file_path // empty' <<<"$input")
event=$(jq -r '.hook_event_name // empty' <<<"$input")
root="${CLAUDE_PROJECT_DIR:-$PWD}"
case "$f" in "$root"/*) ;; *) exit 0 ;; esac   # 프로젝트 밖 파일은 건너뛰어요
[ -f "$root/.sonic-harness/lock.json" ] || exit 0   # 하네스를 적용한 프로젝트에서만 동작해요
case "$f" in "$root"/.sonic-harness/*) exit 0 ;; esac   # 하네스 파일 자체는 검사하지 않아요

block() {
  [ -n "${HARNESS_HOOK_LOG:-}" ] && echo "$event ${f#"$root"/}" >>"$HARNESS_HOOK_LOG"
  printf '%s\n' "$@" >&2
  exit 2
}

if [ "$event" = PreToolUse ]; then
  rel=${f#"$root"/}
  case "$rel" in src/*) ;; *) exit 0 ;; esac
  IFS=/ read -ra parts <<<"$rel"
  for p in "${parts[@]}"; do
    [[ "${p%%.*}" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] ||
      block "경로 '$rel'의 '$p'가 kebab-case가 아니에요. 폴더와 파일 이름은 kebab-case로 써요(예: user-badge.tsx)."
  done
  exit 0
fi

cd "$root" || exit 0
bin="$root/node_modules/.bin"
[ -x "$bin/prettier" ] || exit 0               # 아직 설치 전이면 건너뛰어요
[ -f "$f" ] || exit 0
"$bin/prettier" --write --ignore-unknown --log-level warn "$f" >/dev/null

case "$f" in *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;; *) exit 0 ;; esac
out=$("$bin/eslint" --fix --no-warn-ignored "$f" 2>&1) && exit 0
block "lint 에러가 남아 있어요. harness.md 규칙에 맞게 고쳐 주세요." "$out"
