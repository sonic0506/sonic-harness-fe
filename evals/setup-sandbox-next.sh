#!/usr/bin/env bash
# 평가용 Next.js sandbox(sandbox/next)를 플러그인 스크립트로 새로 만들어요.
# 원본은 이 저장소의 **커밋된** 상태예요. 규칙을 고쳤다면 커밋한 뒤 실행하세요.
#   evals/setup-sandbox-next.sh   →   SANDBOX=sandbox/next evals/run.sh 05
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
app="$here/sandbox/next"
harness="node $here/plugin/scripts/harness.mjs"
[ -e "$app" ] && { echo "이미 있어요: $app (옮기거나 지운 뒤 다시 실행하세요)"; exit 1; }

export SONIC_HARNESS_ORIGIN="$here" SONIC_HARNESS_HOME="$here/sandbox/.harness-home"
mkdir -p "$here/sandbox" && cd "$here/sandbox"
npx --yes create-next-app@16 next --ts --app --src-dir --no-tailwind --no-eslint \
  --use-npm --import-alias "@/*" --yes </dev/null >/dev/null
cd "$app" && git init -q -b main
$harness init
$harness deps >/dev/null

# 라우팅 app/을 루트로 옮기고 src/app은 FSD app 레이어로 써요 (/sonic-harness:init에서 Claude가 하는 일과 같아요)
mkdir -p app src/pages/home/ui
mv src/app/layout.tsx src/app/globals.css src/app/favicon.ico app/
rm -f src/app/page.tsx src/app/page.module.css
cat > app/layout.tsx <<'EOF'
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/app/providers';
import './globals.css';

export const metadata: Metadata = { title: 'sandbox' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
EOF
cat > app/page.tsx <<'EOF'
export { HomePage as default } from '@/pages/home';
EOF
cat > src/pages/home/ui/home-page.tsx <<'EOF'
export function HomePage() {
  return <main>시작</main>;
}
EOF
cat > src/pages/home/index.ts <<'EOF'
export { HomePage } from './ui/home-page';
EOF

npx prettier --write . >/dev/null
npx next build >/dev/null # .next/types를 새 경로로 만들어요
npm run --silent lint && npm run --silent typecheck && npx vitest run --passWithNoTests >/dev/null
git add -A && git -c user.name=sandbox -c user.email=sandbox@local commit -qm "chore: 하네스 적용한 시작 상태"
echo "✓ Next sandbox를 만들었어요: $app"
