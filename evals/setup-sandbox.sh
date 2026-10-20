#!/usr/bin/env bash
# 평가용 sandbox(sandbox/vite)를 플러그인 스크립트로 새로 만들어요.
# 원본은 이 저장소의 **커밋된** 상태예요. 규칙을 고쳤다면 커밋한 뒤 실행하세요.
#   evals/setup-sandbox.sh
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
app="$here/sandbox/vite"
harness="node $here/plugin/scripts/harness.mjs"
[ -e "$app" ] && { echo "이미 있어요: $app (옮기거나 지운 뒤 다시 실행하세요)"; exit 1; }

export SONIC_HARNESS_ORIGIN="$here" SONIC_HARNESS_HOME="$here/sandbox/.harness-home"
mkdir -p "$here/sandbox" && cd "$here/sandbox"
npm create vite@9 vite -- --template react-ts --no-interactive </dev/null >/dev/null
cd "$app" && git init -q -b main && npm i --silent
$harness init
$harness deps >/dev/null

# Vite 시작 파일 정리 (/sonic-harness:init에서 Claude가 하는 일과 같아요)
rm -f src/App.tsx src/App.css .oxlintrc.json
npm uninstall --silent oxlint
mkdir -p src/app/styles src/shared/assets
mv src/index.css src/app/styles/index.css
mv src/assets/* src/shared/assets/ && rmdir src/assets
cat > src/app/app.tsx <<'EOF'
import { AppProviders } from './providers';
import './styles/index.css';

export function App() {
  return (
    <AppProviders>
      <main>시작</main>
    </AppProviders>
  );
}
EOF
cat > src/main.tsx <<'EOF'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/app';

// 개발 화면에서는 MSW로 API 응답을 만들어요.
async function enableMocking() {
  if (!import.meta.env.DEV) return;
  const { worker } = await import('@/app/mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass' });
}

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
EOF
cat > vite.config.ts <<'EOF'
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
});
EOF

npx prettier --write . >/dev/null
npm run --silent lint && npm run --silent typecheck && npx vitest run --passWithNoTests >/dev/null
git add -A && git -c user.name=sandbox -c user.email=sandbox@local commit -qm "chore: 하네스 적용한 시작 상태"
echo "✓ sandbox를 만들었어요: $app"
