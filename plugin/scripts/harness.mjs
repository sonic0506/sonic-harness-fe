#!/usr/bin/env node
// sonic-harness: 원본 저장소의 rules/·templates/를 프로젝트에 적용하고 lock.json으로 버전을 관리해요.
// 판단이 필요한 일(충돌 합치기, 규칙 위반 해석, 승인)은 명령어(commands/*.md)에서 Claude가 해요.
//
//   node harness.mjs init                 원본 최신 규칙과 템플릿을 깔고 lock.json을 만들어요
//   node harness.mjs deps                 필요한 패키지와 npm scripts를 설치해요
//   node harness.mjs design               디자인 시스템(sonic-ui)을 켜요: 설치, eslint·CLAUDE.md 연결, lock 기록
//   node harness.mjs status               버전, 원본의 새 변경, 프로젝트에서 고친 하네스 파일
//   node harness.mjs update [--apply]     최신 규칙 받기 계획(기본) / 적용
//   node harness.mjs add-templates <경로...> update가 알려 준 새 템플릿 중 고른 것을 복사
//   node harness.mjs template-merged <경로>  바뀐 템플릿을 프로젝트 파일에 합친 뒤 완료 처리
//   node harness.mjs resolve <파일>        충돌 파일을 합친 뒤 완료 처리
//   node harness.mjs check-diff           마지막 점검 뒤 받은 규칙 diff
//   node harness.mjs checked              점검을 끝냈다고 기록
//   node harness.mjs contribute-diff      프로젝트에서 고친 하네스 파일 diff
//   node harness.mjs contribute-start <브랜치> <파일...>
//   node harness.mjs contribute-finish <커밋 메시지>
//   node harness.mjs contribute-push <PR 제목> <PR 본문 파일>
//
// 환경 변수: SONIC_HARNESS_ORIGIN(원본 git URL), SONIC_HARNESS_HOME(원본 clone을 둘 폴더)
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN =
  process.env.SONIC_HARNESS_ORIGIN ??
  'https://github.com/sonic0506/sonic-harness-fe.git';
const HOME =
  process.env.SONIC_HARNESS_HOME ?? join(homedir(), '.sonic-harness');
const CLONE = join(HOME, 'origin');
const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = process.cwd();
const DIR = join(PROJECT, '.sonic-harness');
const LOCK = join(DIR, 'lock.json');
const NOT_MANAGED = new Set(['CHANGELOG.md']); // rules/ 안이지만 프로젝트로 복사하지 않는 파일

const DEV_DEPS = [
  'eslint@10',
  '@eslint/js@10',
  'typescript-eslint@8',
  'eslint-plugin-boundaries@7',
  'eslint-plugin-check-file@3',
  'eslint-plugin-react-hooks@7',
  'eslint-import-resolver-typescript@4',
  'globals',
  'prettier@3',
  'typescript@~6.0',
  '@commitlint/cli@21',
  '@commitlint/config-conventional@21',
  'husky@9',
  'lint-staged@17',
  '@tanstack/eslint-plugin-query@5',
  'eslint-plugin-simple-import-sort@14',
  'eslint-plugin-testing-library@7',
  '@vitest/eslint-plugin@1',
  'vitest',
  '@vitejs/plugin-react',
  'jsdom',
  '@testing-library/react',
  '@testing-library/jest-dom',
  '@testing-library/user-event',
  'msw',
  '@playwright/test',
  '@types/node@24',
];
const DEPS = [
  '@tanstack/react-query',
  'zustand',
  'react-error-boundary',
  'nuqs@2',
  'zod@4',
];
// 프레임워크별로 더 쓰는 패키지
const KIND_DEPS = {
  next: { dev: ['@next/eslint-plugin-next@16'], prod: ['server-only'] },
  vite: { dev: [], prod: [] },
};
// 디자인 시스템을 켜면(lock.designSystem) 더 쓰는 패키지. 버전은 늘 latest를 받아요(package.json에는 ^ 범위).
// 글꼴은 이름을 바꾸지 않는 fontsource로 받아요(sonic-ui가 "IBM Plex Sans KR"/"IBM Plex Mono" 이름을 찾아요).
const DESIGN_DEPS = [
  '@xonic0506/sonic-ui',
  'lucide-react',
  '@fontsource/ibm-plex-sans-kr',
  '@fontsource/ibm-plex-mono',
];
const DESIGN_DOCS = [
  '@node_modules/@xonic0506/sonic-ui/DESIGN.md',
  '@node_modules/@xonic0506/sonic-ui/AI-RULES.md',
];
const depsFor = (kind, designSystem = false) => ({
  dev: [...DEV_DEPS, ...KIND_DEPS[kind].dev],
  prod: [
    ...DEPS,
    ...KIND_DEPS[kind].prod,
    ...(designSystem ? ['@xonic0506/sonic-ui'] : []), // 글꼴은 다른 방식으로 불러와도 돼요
  ],
});
const hasPackage = (name) => {
  const pkg = JSON.parse(read(join(PROJECT, 'package.json')) ?? '{}');
  return name in { ...pkg.dependencies, ...pkg.devDependencies };
};

// ---------- 작은 도구 ----------
const git = (...args) =>
  execFileSync('git', ['-C', CLONE, ...args], { encoding: 'utf8' }).trim();
const sha = (text) => createHash('sha256').update(text).digest('hex');
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
const read = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);
const write = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};
// lock.json과 인자는 손으로 바뀔 수 있어서 쓰기 전에 확인해요: 파일 이름은 rules/ 바로 아래 이름만,
// ref는 40자리 커밋 sha만(경로 밖으로 나가거나 git 옵션으로 읽히지 않게).
const safeName = (f) =>
  /^[A-Za-z0-9._-]+$/.test(f) && !f.includes('..')
    ? f
    : fail(`하네스 파일 이름이 올바르지 않아요: ${f}`);
// 템플릿 경로(src/shared/api/http.ts 같은 프로젝트 기준 상대 경로)
const safePath = (p) =>
  /^[A-Za-z0-9._-][A-Za-z0-9._/-]*$/.test(p) && !p.includes('..')
    ? p
    : fail(`템플릿 경로가 올바르지 않아요: ${p}`);
// 공백은 빼고 비교해요(프로젝트 Prettier가 줄바꿈만 바꾼 경우는 '안 고침'으로 봐요).
const squash = (text) => (text ?? '').replace(/\s+/g, '');
const safeRef = (ref) =>
  /^[0-9a-f]{40}$/.test(ref)
    ? ref
    : fail(`lock.json의 버전이 올바르지 않아요: ${ref}`);
function readLock() {
  if (!existsSync(LOCK)) return null;
  const lock = JSON.parse(readFileSync(LOCK, 'utf8'));
  safeRef(lock.ref);
  safeRef(lock.checkedRef);
  Object.keys(lock.files).forEach(safeName);
  lock.pending.forEach(safeName);
  Object.values(lock.contributing ?? {}).forEach((c) => {
    c.files.forEach(safeName);
    (c.templates ?? []).forEach(safePath);
  });
  return lock;
}
const writeLock = (lock) =>
  writeFileSync(
    LOCK,
    `${JSON.stringify({ ...lock, updatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
const needLock = () =>
  readLock() ??
  fail('이 프로젝트에 하네스가 없어요. /sonic-harness:init을 먼저 실행하세요.');

// 원본 clone을 만들거나 최신으로 받아요. 반환: 원본 기본 브랜치의 최신 커밋
function syncOrigin() {
  if (!existsSync(join(CLONE, '.git'))) {
    mkdirSync(HOME, { recursive: true });
    execFileSync('git', ['clone', '--quiet', ORIGIN, CLONE], {
      stdio: 'inherit',
    });
  } else {
    git('fetch', '--quiet', 'origin');
  }
  return safeRef(git('rev-parse', `origin/${defaultBranch()}`));
}
const defaultBranch = () =>
  git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD').replace(
    'origin/',
    '',
  );
const listAt = (ref, dir) =>
  git('ls-tree', '-r', '--name-only', ref, `${dir}/`)
    .split('\n')
    .filter(Boolean)
    .map((p) => p.slice(dir.length + 1));
const showAt = (ref, path) => {
  try {
    return execFileSync('git', ['-C', CLONE, 'show', `${ref}:${path}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
};
const managedAt = (ref) =>
  listAt(ref, 'rules')
    .filter((f) => !NOT_MANAGED.has(f))
    .map(safeName);
const newCommits = (from, to) =>
  git(
    'log',
    '--oneline',
    `${from}..${to}`,
    '--',
    'rules',
    'templates',
    'templates.vite',
    'templates.next',
  );
// 공통 templates/ 위에 프레임워크별 templates.<kind>/를 겹쳐요. 같은 경로면 프레임워크별 파일이 이겨요.
// 반환: Map<프로젝트 경로, 원본 경로>
const templatesAt = (ref, kind) => {
  const map = new Map(
    listAt(ref, 'templates').map((p) => [p, `templates/${p}`]),
  );
  for (const p of listAt(ref, `templates.${kind}`))
    map.set(p, `templates.${kind}/${p}`);
  return map;
};

// 하네스가 쓰는 패키지 중 package.json에 없는 것. 규칙이 새 ESLint 플러그인을 쓰게 되면 update가 알려 줘요.
function missingPackages(designSystem) {
  const pkg = JSON.parse(read(join(PROJECT, 'package.json')) ?? '{}');
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  const name = (spec) => spec.replace(/(.)@[^@/]+$/, '$1'); // '@a/b@5' → '@a/b', 'typescript@~6.0' → 'typescript'
  const missing = (list) => list.filter((spec) => !(name(spec) in all));
  const { dev, prod } = depsFor(projectKind(), designSystem);
  return { dev: missing(dev), prod: missing(prod) };
}

function projectKind() {
  const text =
    read(join(PROJECT, 'package.json')) ??
    fail('package.json이 없어요. 프로젝트 루트에서 실행하세요.');
  const pkg = JSON.parse(text);
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  if (all.next) return 'next';
  if (all.vite) return 'vite';
  return fail(
    'Vite나 Next.js 프로젝트가 아니에요(package.json에 vite나 next가 없어요).',
  );
}

// ---------- 명령 ----------
const commands = {
  init() {
    if (readLock())
      fail(
        '이미 하네스가 있어요. 최신으로 받으려면 /sonic-harness:update를 쓰세요.',
      );
    const kind = projectKind();
    const ref = syncOrigin();
    const files = {};
    for (const f of managedAt(ref)) {
      const text = showAt(ref, `rules/${f}`);
      write(join(DIR, f), text);
      files[f] = sha(text);
    }
    const copied = [];
    const skipped = [];
    for (const [f, src] of templatesAt(ref, kind)) {
      const dest = join(PROJECT, f);
      if (existsSync(dest)) {
        skipped.push(f);
        continue;
      }
      write(dest, showAt(ref, src));
      copied.push(f);
    }
    // sonic-ui 문서는 설치한 뒤에만 불러와요(없는 파일을 불러오지 않게). design이 다시 넣어요.
    if (copied.includes('CLAUDE.md')) {
      const claudePath = join(PROJECT, 'CLAUDE.md');
      writeFileSync(
        claudePath,
        read(claudePath)
          .split('\n')
          .filter((line) => !DESIGN_DOCS.includes(line.trim()))
          .join('\n'),
      );
    }
    // tsconfig에 strict 묶음 연결
    const ts = join(
      PROJECT,
      kind === 'vite' ? 'tsconfig.app.json' : 'tsconfig.json',
    );
    const tsText = read(ts) ?? fail(`${ts}가 없어요.`);
    if (!tsText.includes('.sonic-harness/tsconfig.strict.json'))
      writeFileSync(
        ts,
        tsText.replace(
          '{',
          '{\n  "extends": "./.sonic-harness/tsconfig.strict.json",',
        ),
      );
    if (kind === 'next') {
      // next dev가 만드는 .next/dev/types는 noUnused*를 어겨요. 빌드용 .next/types만 검사해요
      const nextTs = read(ts);
      if (!nextTs.includes('".next/dev"'))
        writeFileSync(
          ts,
          nextTs.replace('"exclude": [', '"exclude": [".next/dev", '),
        );
      write(join(PROJECT, 'pages/.gitkeep'), ''); // src/pages를 Pages Router로 읽지 않게
      const claude = read(join(PROJECT, 'CLAUDE.md')) ?? '';
      if (
        existsSync(join(PROJECT, 'AGENTS.md')) &&
        !claude.includes('@AGENTS.md')
      )
        writeFileSync(
          join(PROJECT, 'CLAUDE.md'),
          `${claude.trimEnd()}\n@AGENTS.md\n`,
        );
    }
    writeLock({
      origin: ORIGIN,
      ref,
      checkedRef: ref,
      files,
      pending: [],
      kind,
      designSystem: false, // design 명령이 true로 바꿔요
      templates: [...templatesAt(ref, kind).keys()], // 이미 본 템플릿. update는 이 밖의 새 템플릿만 알려 줘요
    });
    console.log(`✓ 하네스 ${ref.slice(0, 7)}를 적용했어요 (${kind}).`);
    console.log(`  .sonic-harness/: ${Object.keys(files).join(', ')}`);
    console.log(`  복사한 템플릿: ${copied.join(', ') || '없음'}`);
    console.log(`  이미 있어서 건너뛴 템플릿: ${skipped.join(', ') || '없음'}`);
  },

  deps() {
    const kind = projectKind();
    const npm = (...args) => {
      const r = spawnSync('npm', args, { cwd: PROJECT, stdio: 'inherit' });
      if (r.status !== 0) fail(`npm ${args.join(' ')} 실패`);
    };
    const { dev, prod } = depsFor(kind);
    npm('i', '-D', ...dev);
    npm('i', ...prod);
    spawnSync('npx', ['msw', 'init', 'public', '--save'], {
      cwd: PROJECT,
      stdio: 'ignore',
    });
    npm(
      'pkg',
      'set',
      'scripts.lint=eslint .',
      'scripts.format=prettier --write .',
      `scripts.typecheck=${kind === 'vite' ? 'tsc -b' : 'tsc --noEmit'}`,
      'scripts.test=vitest run',
      'scripts.e2e=playwright test',
      // Next: 이미지 import 타입이 next-env.d.ts(.gitignore)에 있어서, npm ci 때 만들어야 CI의 lint·typecheck가 통과해요.
      `scripts.prepare=${kind === 'vite' ? 'husky' : 'husky && next typegen'}`,
    );
    if (existsSync(join(PROJECT, '.git')))
      spawnSync('npx', ['husky'], { cwd: PROJECT, stdio: 'ignore' });
    else
      console.log(
        '  git 저장소가 아니라 husky는 건너뛰었어요. git init 후 npx husky를 실행하세요.',
      );
    console.log('✓ 패키지와 scripts를 설치했어요.');
  },

  // CSS 연결, 앱 루트 isolate처럼 프로젝트마다 위치가 다른 일은 명령어(init.md)에서 Claude가 해요.
  design() {
    const lock = needLock();
    const r = spawnSync('npm', ['i', ...DESIGN_DEPS], {
      cwd: PROJECT,
      stdio: 'inherit',
    });
    if (r.status !== 0) fail(`npm i ${DESIGN_DEPS.join(' ')} 실패`);
    // sonic-ui의 tailwind.css(bg-primary, text-muted …)를 쓰려면 Tailwind v4가 있어야 해요.
    const hadTailwind = hasPackage('tailwindcss');
    const tailwind = [
      'tailwindcss@4',
      projectKind() === 'next'
        ? '@tailwindcss/postcss@4'
        : '@tailwindcss/vite@4',
    ];
    if (!hadTailwind) {
      const t = spawnSync('npm', ['i', '-D', ...tailwind], {
        cwd: PROJECT,
        stdio: 'inherit',
      });
      if (t.status !== 0) fail(`npm i -D ${tailwind.join(' ')} 실패`);
    }
    const todo = [];
    const eslintPath = join(PROJECT, 'eslint.config.mjs');
    const eslint = read(eslintPath) ?? '';
    const on = eslint
      .replace(
        /^\/\/ 디자인 규칙\(sonic-ui\):.*$/m,
        '// 디자인 규칙(sonic-ui): DESIGN.md의 토큰 밖 값(임의 값 클래스, 기본 팔레트, hex)을 막아요.',
      )
      .replace(
        /^\/\/ (import sonicDesign from '@xonic0506\/sonic-ui\/eslint-design-rules';)$/m,
        '$1',
      )
      .replace(/^(\s*)\/\/ (sonicDesign,)$/m, '$1$2');
    if (/^import sonicDesign/m.test(on) && /^\s*sonicDesign,$/m.test(on))
      writeFileSync(eslintPath, on);
    else
      todo.push(
        "eslint.config.mjs에 import sonicDesign from '@xonic0506/sonic-ui/eslint-design-rules'와 배열 안 sonicDesign을 넣어요",
      );
    const claudePath = join(PROJECT, 'CLAUDE.md');
    const claude = read(claudePath) ?? '';
    const missingDocs = DESIGN_DOCS.filter((d) => !claude.includes(d));
    if (missingDocs.length && claude.includes('@.sonic-harness/harness.md'))
      writeFileSync(
        claudePath,
        claude.replace(/^@\.sonic-harness\/harness\.md$/m, (line) =>
          [line, ...missingDocs].join('\n'),
        ),
      );
    else if (missingDocs.length)
      todo.push(`CLAUDE.md에 ${missingDocs.join(', ')}를 넣어요`);
    writeLock({ ...lock, designSystem: true });
    console.log('✓ 디자인 시스템(sonic-ui)을 켰어요.');
    console.log(`  설치: ${DESIGN_DEPS.join(', ')}`);
    console.log(
      `  tailwindcss: ${hadTailwind ? '이미 있음' : `새로 설치 (${tailwind.join(', ')}, 연결 필요)`}`,
    );
    if (todo.length)
      console.log(`  직접 할 일:\n${todo.map((t) => `    ${t}`).join('\n')}`);
  },

  status() {
    const lock = needLock();
    const latest = syncOrigin();
    console.log(`원본: ${lock.origin}`);
    console.log(`적용 버전: ${lock.ref.slice(0, 7)} (${lock.updatedAt})`);
    console.log(
      lock.designSystem
        ? '디자인 시스템(sonic-ui): 사용'
        : '디자인 시스템(sonic-ui): 사용 안 함 (켜려면 /sonic-harness:init design)',
    );
    const log = newCommits(lock.ref, latest);
    console.log(
      log
        ? `원본의 새 변경 (update로 받을 수 있어요):\n${log.replace(/^/gm, '  ')}`
        : '원본의 새 변경: 없음 (최신)',
    );
    const changed = Object.entries(lock.files).filter(
      ([f, h]) => sha(read(join(DIR, f)) ?? '') !== h,
    );
    const prOf = (f) =>
      Object.values(lock.contributing ?? {}).find((c) => c.files.includes(f))
        ?.pr ?? null;
    const describe = ([f]) =>
      `  ${f}${prOf(f) ? ` (PR 진행 중: ${prOf(f)})` : ' (아직 올리지 않음)'}`;
    console.log(
      changed.length
        ? `프로젝트에서 고친 하네스 파일:\n${changed.map(describe).join('\n')}`
        : '프로젝트에서 고친 하네스 파일: 없음',
    );
    if (lock.pending.length)
      console.log(
        `합치는 중인 파일: ${lock.pending.join(', ')} (resolve 필요)`,
      );
    if (lock.templateMerges?.length)
      console.log(
        `합치는 중인 템플릿: ${lock.templateMerges.join(', ')} (template-merged 필요)`,
      );
    if (lock.checkedRef !== lock.ref)
      console.log(
        '받았지만 아직 점검하지 않은 규칙 변경이 있어요 (/sonic-harness:check).',
      );
    const here = JSON.parse(
      read(join(PLUGIN_ROOT, '.claude-plugin/plugin.json')) ?? '{}',
    ).version;
    const there = JSON.parse(
      showAt(latest, 'plugin/.claude-plugin/plugin.json') ?? '{}',
    ).version;
    console.log(
      `플러그인: ${here ?? '?'}${there && there !== here ? ` → ${there} 있음 (/plugin에서 sonic-harness 업데이트)` : ' (최신)'}`,
    );
  },

  update(flag) {
    const lock = needLock();
    if (lock.pending.length)
      fail(
        `합치는 중인 파일이 있어요: ${lock.pending.join(', ')}. 먼저 resolve하세요.`,
      );
    const latest = syncOrigin();
    const plan = [];
    for (const f of new Set([
      ...managedAt(latest),
      ...Object.keys(lock.files),
    ])) {
      const incoming = showAt(latest, `rules/${f}`);
      const local = read(join(DIR, f));
      const base = lock.files[f];
      if (incoming === null) plan.push({ f, action: 'removed-upstream' });
      else if (base === undefined)
        plan.push({ f, action: local === null ? 'add' : 'conflict' });
      else if (sha(incoming) === base) plan.push({ f, action: 'up-to-date' });
      else if (local !== null && sha(local) === sha(incoming))
        plan.push({ f, action: 'same' });
      else if (local === null || sha(local) === base)
        plan.push({ f, action: 'overwrite' });
      else plan.push({ f, action: 'conflict' });
    }
    const label = {
      'up-to-date': '최신',
      same: '이미 같음',
      overwrite: '갱신',
      add: '새 파일',
      conflict: '충돌 (프로젝트와 원본이 둘 다 고침)',
      'removed-upstream': '원본에서 삭제됨 (그대로 둠)',
    };
    console.log(`${lock.ref.slice(0, 7)} → ${latest.slice(0, 7)}`);
    for (const { f, action } of plan) console.log(`  ${label[action]}: ${f}`);
    // 원본에 새로 생긴 템플릿 중 프로젝트에 없는 것. 이미 본(거절한) 템플릿은 다시 묻지 않아요.
    const kind = lock.kind ?? projectKind();
    const seen = new Set(lock.templates ?? templatesAt(lock.ref, kind).keys());
    const newTemplates = [...templatesAt(latest, kind).keys()].filter(
      (p) => !seen.has(p) && !existsSync(join(PROJECT, p)),
    );
    // 원본에서 바뀐 템플릿 중 프로젝트에 있는 것. 안 고쳤으면 새 원본으로 바꾸고, 고쳤으면 합치기를 요청해요.
    const oldTemplates = templatesAt(lock.ref, kind);
    const changedTemplates = [...templatesAt(latest, kind)]
      .filter(([p]) => oldTemplates.has(p) && existsSync(join(PROJECT, p)))
      .map(([p, src]) => ({
        p,
        from: oldTemplates.get(p),
        to: src,
        before: showAt(lock.ref, oldTemplates.get(p)),
        after: showAt(latest, src),
        local: read(join(PROJECT, p)),
      }))
      .filter((t) => squash(t.before) !== squash(t.after))
      .map((t) => ({
        ...t,
        state:
          squash(t.local) === squash(t.after)
            ? 'same'
            : squash(t.local) === squash(t.before)
              ? 'clean'
              : 'modified',
      }));
    const templateLabel = {
      same: '이미 같음',
      clean: '갱신 (프로젝트에서 안 고침)',
      modified: '합치기 필요 (프로젝트에서도 고침)',
    };
    // 바뀌거나 새로 받을 템플릿이 import하는 새 템플릿은 빼면 빌드가 깨져서 '필수'로 표시해요.
    const required = new Map();
    const incoming = [
      ...changedTemplates
        .filter((t) => t.state !== 'same')
        .map((t) => [t.p, t.after]),
      ...newTemplates.map((p) => [
        p,
        showAt(latest, templatesAt(latest, kind).get(p)),
      ]),
    ];
    for (const [from, text] of incoming)
      for (const [, spec] of (text ?? '').matchAll(
        /from '(@\/[^']+|\.[^']*)'/g,
      )) {
        const base = spec.startsWith('@/')
          ? `src/${spec.slice(2)}`
          : posix.join(posix.dirname(from), spec);
        for (const p of newTemplates)
          if (
            p !== from &&
            [base, `${base}/`].some((b) => p.startsWith(b)) &&
            !required.has(p)
          )
            required.set(p, from);
      }
    if (newTemplates.length)
      console.log(
        `새 템플릿 (프로젝트에 없음, 고르면 add-templates로 복사해요):\n${newTemplates.map((p) => `  ${p}${required.has(p) ? ` (필수: ${required.get(p)}가 불러와요)` : ''}`).join('\n')}`,
      );
    if (changedTemplates.length)
      console.log(
        `원본에서 바뀐 템플릿:\n${changedTemplates.map((t) => `  ${templateLabel[t.state]}: ${t.p}`).join('\n')}`,
      );
    // designSystem이 없던 예전 lock은 sonic-ui가 설치돼 있으면 쓰는 것으로 봐요.
    lock.designSystem ??= hasPackage('@xonic0506/sonic-ui');
    const { dev, prod } = missingPackages(lock.designSystem);
    if (dev.length || prod.length)
      console.log(
        `하네스가 쓰는데 프로젝트에 없는 패키지 (적용 뒤 설치해요):\n${[dev.length && `  npm i -D ${dev.join(' ')}`, prod.length && `  npm i ${prod.join(' ')}`].filter(Boolean).join('\n')}`,
      );
    const log = newCommits(lock.ref, latest);
    if (log) console.log(`변경 기록:\n${log.replace(/^/gm, '  ')}`);
    if (flag !== '--apply')
      return console.log('\n(계획만 보여 줬어요. 적용하려면 --apply)');
    lock.kind = kind;
    lock.templates = [...templatesAt(latest, kind).keys()];

    const pending = [];
    for (const { f, action } of plan) {
      const incoming = showAt(latest, `rules/${f}`);
      if (['overwrite', 'add', 'same'].includes(action)) {
        write(join(DIR, f), incoming);
        lock.files[f] = sha(incoming);
      } else if (action === 'conflict') {
        write(join(DIR, `${f}.incoming`), incoming);
        write(join(DIR, `${f}.base`), showAt(lock.ref, `rules/${f}`) ?? '');
        pending.push(f);
      }
    }
    // PR이 합쳐져 원본과 같아진 파일은 'PR 진행 중' 기록에서 지워요.
    const contributing = Object.fromEntries(
      Object.entries(lock.contributing ?? {}).filter(
        ([, c]) =>
          c.files.some(
            (f) => sha(read(join(DIR, f)) ?? '') !== lock.files[f],
          ) ||
          (c.templates ?? []).some(
            (p) =>
              squash(read(join(PROJECT, p))) !==
              squash(showAt(latest, templatesAt(latest, kind).get(p))),
          ),
      ),
    );
    const templateMerges = new Set(lock.templateMerges ?? []);
    for (const t of changedTemplates) {
      if (t.state === 'clean') write(join(PROJECT, t.p), t.after);
      if (t.state !== 'modified') continue;
      templateMerges.add(t.p);
      console.log(`\n— ${t.p}: 원본에서 바뀐 내용 (프로젝트 파일에 합쳐요)`);
      console.log(
        git('diff', '--no-color', lock.ref, latest, '--', t.from, t.to),
      );
    }
    writeLock({
      ...lock,
      ref: latest,
      pending,
      contributing,
      templateMerges: [...templateMerges],
    });
    console.log(`\n✓ ${latest.slice(0, 7)}로 갱신했어요.`);
    if (templateMerges.size)
      console.log(
        `  합칠 템플릿 ${templateMerges.size}개: 위 diff를 프로젝트 파일에 반영한 뒤 template-merged <경로>`,
      );
    if (pending.length)
      console.log(
        `  충돌 ${pending.length}개: .sonic-harness/<파일>(프로젝트), <파일>.base(이전 원본), <파일>.incoming(새 원본)을 합친 뒤 resolve <파일>`,
      );
  },

  'template-merged'(p) {
    const lock = needLock();
    if (!(lock.templateMerges ?? []).includes(p))
      fail(
        `${p}는 합치는 중인 템플릿이 아니에요. 대기 중: ${(lock.templateMerges ?? []).join(', ') || '없음'}`,
      );
    writeLock({
      ...lock,
      templateMerges: lock.templateMerges.filter((t) => t !== p),
    });
    console.log(`✓ ${p} 템플릿 합치기를 끝냈어요.`);
  },

  'add-templates'(...paths) {
    const lock = needLock();
    if (!paths.length) fail('사용법: add-templates <경로...>');
    syncOrigin();
    // 원본 템플릿 목록에 있는 경로만 받아요(경로 밖으로 나가지 않게).
    const available = templatesAt(lock.ref, lock.kind ?? projectKind());
    for (const p of paths) {
      if (!available.has(p)) fail(`원본 템플릿이 아니에요: ${p}`);
      if (existsSync(join(PROJECT, p))) {
        console.log(`  건너뜀(이미 있음): ${p}`);
        continue;
      }
      write(join(PROJECT, p), showAt(lock.ref, available.get(p)));
      console.log(`  복사: ${p}`);
    }
    console.log('✓ 템플릿을 복사했어요.');
  },

  resolve(f) {
    safeName(f ?? '');
    const lock = needLock();
    if (!lock.pending.includes(f))
      fail(
        `${f}는 합치는 중인 파일이 아니에요. 대기 중: ${lock.pending.join(', ') || '없음'}`,
      );
    // 기준은 새 원본이에요. 프로젝트에 남긴 차이는 '프로젝트에서 고친 파일'로 보여요.
    lock.files[f] = sha(read(join(DIR, `${f}.incoming`)));
    unlinkSync(join(DIR, `${f}.incoming`));
    unlinkSync(join(DIR, `${f}.base`));
    lock.pending = lock.pending.filter((p) => p !== f);
    writeLock(lock);
    console.log(
      `✓ ${f} 합치기를 끝냈어요.${lock.pending.length ? ` 남은 파일: ${lock.pending.join(', ')}` : ''}`,
    );
  },

  // update를 여러 번 해도 마지막 점검(checkedRef) 뒤 받은 변경을 모두 보여 줘요.
  'check-diff'() {
    const lock = needLock();
    syncOrigin();
    if (lock.checkedRef === lock.ref)
      return console.log('마지막 점검 뒤 받은 규칙 변경이 없어요.');
    const range = `${lock.checkedRef}..${lock.ref}`;
    console.log(
      `점검할 규칙 변경: ${lock.checkedRef.slice(0, 7)} → ${lock.ref.slice(0, 7)}\n`,
    );
    console.log(git('log', '--format=- %s', range, '--', 'rules'));
    console.log(git('diff', range, '--', 'rules'));
  },

  checked() {
    const lock = needLock();
    writeLock({ ...lock, checkedRef: lock.ref });
    console.log(`✓ ${lock.ref.slice(0, 7)}까지 점검했다고 기록했어요.`);
  },

  'contribute-diff'() {
    const lock = needLock();
    syncOrigin();
    const main = `origin/${defaultBranch()}`;
    let found = false;
    const show = (src, base, local, label) => {
      found = true;
      const tmp = join(HOME, 'tmp', src);
      write(tmp, base);
      const r = spawnSync(
        'git',
        ['diff', '--no-index', '--no-color', tmp, local],
        { encoding: 'utf8' },
      );
      console.log(
        r.stdout
          .replaceAll(tmp, `/원본/${src}`)
          .replaceAll(local, `/프로젝트/${label}`),
      );
      if (showAt(main, src) !== base)
        console.log(
          `⚠ ${label}는 원본에서도 바뀌었어요. 먼저 /sonic-harness:update로 받으세요.\n`,
        );
    };
    for (const [f, h] of Object.entries(lock.files)) {
      const local = join(DIR, f);
      if (sha(read(local) ?? '') !== h)
        show(`rules/${f}`, showAt(lock.ref, `rules/${f}`) ?? '', local, f);
    }
    // 템플릿은 프로젝트 파일이라 많이 고쳐요. 공통으로 쓸 만한 변경만 골라서 올려요.
    for (const [p, src] of templatesAt(lock.ref, lock.kind ?? projectKind())) {
      const local = join(PROJECT, p);
      const base = showAt(lock.ref, src) ?? '';
      if (existsSync(local) && squash(read(local)) !== squash(base))
        show(src, base, local, `${p} (템플릿)`);
    }
    if (!found) console.log('프로젝트에서 고친 하네스 파일이 없어요.');
  },

  'contribute-start'(branch, ...files) {
    const lock = needLock();
    if (!branch || !files.length)
      fail('사용법: contribute-start <브랜치> <파일...>');
    if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.startsWith('-'))
      fail(`브랜치 이름이 올바르지 않아요: ${branch}`);
    syncOrigin();
    const main = `origin/${defaultBranch()}`;
    if (git('status', '--porcelain'))
      fail(`원본 clone(${CLONE})에 커밋하지 않은 변경이 있어요.`);
    // 규칙 파일(.sonic-harness/<이름>)과 템플릿(프로젝트 기준 경로)을 함께 받아요.
    const available = templatesAt(lock.ref, lock.kind ?? projectKind());
    const moves = files.map((f) => {
      if (f in lock.files)
        return { f, src: `rules/${safeName(f)}`, local: join(DIR, f) };
      if (available.has(safePath(f)))
        return {
          f,
          src: available.get(f),
          local: join(PROJECT, f),
          isTemplate: true,
        };
      return fail(`${f}는 하네스 파일이나 템플릿이 아니에요.`);
    });
    for (const { f, src } of moves)
      if (showAt(main, src) !== showAt(lock.ref, src))
        fail(
          `${f}는 원본에서도 바뀌었어요. /sonic-harness:update로 먼저 받으세요.`,
        );
    // 프로젝트 파일을 먼저 같은 Prettier 설정으로 맞춰요. 그래야 PR이 합쳐진 뒤 update에서 '이미 같음'이 돼요.
    spawnSync('npx', ['prettier', '--write', ...moves.map((m) => m.local)], {
      cwd: PROJECT,
      stdio: 'ignore',
    });
    git('checkout', '--quiet', '-B', branch, main);
    for (const m of moves) write(join(CLONE, m.src), read(m.local));
    // status가 이 파일을 'PR 진행 중'으로 보여 주게 기록해요. update로 원본과 같아지면 지워져요.
    writeLock({
      ...lock,
      contributing: {
        ...lock.contributing,
        [branch]: {
          files: moves.filter((m) => !m.isTemplate).map((m) => m.f),
          templates: moves.filter((m) => m.isTemplate).map((m) => m.f),
        },
      },
    });
    console.log(
      `✓ 원본 clone에 ${branch} 브랜치를 만들고 ${moves.map((m) => m.src).join(', ')}를 옮겼어요.`,
    );
    console.log(`  원본 clone: ${CLONE}`);
    console.log(
      '  lint 규칙을 바꿨다면 tests/lint-samples에 bad/good 샘플을, rules/CHANGELOG.md에 한 줄을 추가하세요.',
    );
  },

  'contribute-finish'(message) {
    if (!message) fail('사용법: contribute-finish <커밋 메시지>');
    if (!existsSync(join(CLONE, 'node_modules')))
      spawnSync('npm', ['ci'], { cwd: CLONE, stdio: 'inherit' });
    // 프로젝트에서 넘어온 파일을 원본 형식에 맞추고, 원본 저장소 자체 lint도 통과해야 해요.
    spawnSync('npx', ['prettier', '--write', 'rules', 'tests', 'evals'], {
      cwd: CLONE,
      stdio: 'ignore',
    });
    // 템플릿은 templates/의 prettier 설정을 못 읽어서 하네스 설정으로 따로 맞춰요.
    spawnSync('npm', ['run', 'format:templates'], {
      cwd: CLONE,
      stdio: 'ignore',
    });
    const lint = spawnSync('npx', ['eslint', '.'], {
      cwd: CLONE,
      encoding: 'utf8',
    });
    if (lint.status !== 0)
      fail(`원본 저장소 lint가 실패했어요.\n${lint.stdout}`);
    const test = spawnSync('npm', ['run', 'test:lint'], {
      cwd: CLONE,
      encoding: 'utf8',
    });
    console.log(
      test.stdout
        .split('\n')
        .filter((l) => /✗|기대|실제|샘플이/.test(l))
        .join('\n'),
    );
    if (test.status !== 0)
      fail(
        'lint 샘플 테스트가 실패했어요. 원본 clone에서 고친 뒤 다시 실행하세요.',
      );
    git('add', '-A');
    git('commit', '--quiet', '-m', message);
    console.log(`✓ 커밋했어요: ${git('log', '--oneline', '-1')}`);
    console.log(git('diff', '--stat', `origin/${defaultBranch()}..HEAD`));
  },

  'contribute-push'(title, bodyFile) {
    if (!title || !bodyFile)
      fail('사용법: contribute-push <PR 제목> <PR 본문 파일>');
    const lock = needLock();
    const branch = git('branch', '--show-current');
    const remember = (where) => {
      if (lock.contributing?.[branch]) lock.contributing[branch].pr = where;
      writeLock(lock);
    };
    git('push', '--quiet', '-u', 'origin', branch);
    if (!/github\.com/.test(git('remote', 'get-url', 'origin'))) {
      remember(`브랜치 ${branch}`);
      return console.log(
        `✓ ${branch}를 push했어요(GitHub 원본이 아니라 PR은 만들지 않았어요).`,
      );
    }
    const pr = spawnSync(
      'gh',
      [
        'pr',
        'create',
        '--title',
        title,
        '--body-file',
        bodyFile,
        '--head',
        branch,
      ],
      {
        cwd: CLONE,
        encoding: 'utf8',
      },
    );
    if (pr.status !== 0) fail(pr.stderr);
    remember(pr.stdout.trim());
    console.log(`✓ PR을 만들었어요: ${pr.stdout.trim()}`);
  },
};

const [cmd, ...args] = process.argv.slice(2);
(commands[cmd] ?? (() => fail(`명령: ${Object.keys(commands).join(', ')}`)))(
  ...args,
);
