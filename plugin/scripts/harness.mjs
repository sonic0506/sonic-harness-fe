#!/usr/bin/env node
// sonic-harness: 원본 저장소의 rules/·templates/를 프로젝트에 적용하고 lock.json으로 버전을 관리해요.
// 판단이 필요한 일(충돌 합치기, 규칙 위반 해석, 승인)은 명령어(commands/*.md)에서 Claude가 해요.
//
//   node harness.mjs init                 원본 최신 규칙과 템플릿을 깔고 lock.json을 만들어요
//   node harness.mjs deps                 필요한 패키지와 npm scripts를 설치해요
//   node harness.mjs status               버전, 원본의 새 변경, 프로젝트에서 고친 하네스 파일
//   node harness.mjs update [--apply]     최신 규칙 받기 계획(기본) / 적용
//   node harness.mjs add-templates <경로...> update가 알려 준 새 템플릿 중 고른 것을 복사
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
import { dirname, join } from 'node:path';
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
];

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
  Object.values(lock.contributing ?? {}).forEach((c) =>
    c.files.forEach(safeName),
  );
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
    npm('i', '-D', ...DEV_DEPS);
    npm('i', ...DEPS);
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
      'scripts.prepare=husky',
    );
    if (existsSync(join(PROJECT, '.git')))
      spawnSync('npx', ['husky'], { cwd: PROJECT, stdio: 'ignore' });
    else
      console.log(
        '  git 저장소가 아니라 husky는 건너뛰었어요. git init 후 npx husky를 실행하세요.',
      );
    console.log('✓ 패키지와 scripts를 설치했어요.');
  },

  status() {
    const lock = needLock();
    const latest = syncOrigin();
    console.log(`원본: ${lock.origin}`);
    console.log(`적용 버전: ${lock.ref.slice(0, 7)} (${lock.updatedAt})`);
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
    if (newTemplates.length)
      console.log(
        `새 템플릿 (프로젝트에 없음, 고르면 add-templates로 복사해요):\n${newTemplates.map((p) => `  ${p}`).join('\n')}`,
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
      Object.entries(lock.contributing ?? {}).filter(([, c]) =>
        c.files.some((f) => sha(read(join(DIR, f)) ?? '') !== lock.files[f]),
      ),
    );
    writeLock({ ...lock, ref: latest, pending, contributing });
    console.log(`\n✓ ${latest.slice(0, 7)}로 갱신했어요.`);
    if (pending.length)
      console.log(
        `  충돌 ${pending.length}개: .sonic-harness/<파일>(프로젝트), <파일>.base(이전 원본), <파일>.incoming(새 원본)을 합친 뒤 resolve <파일>`,
      );
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
    for (const [f, h] of Object.entries(lock.files)) {
      const local = join(DIR, f);
      if (sha(read(local) ?? '') === h) continue;
      found = true;
      const base = showAt(lock.ref, `rules/${f}`) ?? '';
      const tmp = join(HOME, 'tmp', f);
      write(tmp, base);
      const r = spawnSync(
        'git',
        ['diff', '--no-index', '--no-color', tmp, local],
        {
          encoding: 'utf8',
        },
      );
      console.log(
        r.stdout
          .replaceAll(tmp, `/원본/${f}`)
          .replaceAll(local, `/프로젝트/${f}`),
      );
      if (showAt(main, `rules/${f}`) !== base)
        console.log(
          `⚠ ${f}는 원본에서도 바뀌었어요. 먼저 /sonic-harness:update로 받으세요.\n`,
        );
    }
    if (!found) console.log('프로젝트에서 고친 하네스 파일이 없어요.');
  },

  'contribute-start'(branch, ...files) {
    const lock = needLock();
    if (!branch || !files.length)
      fail('사용법: contribute-start <브랜치> <파일...>');
    if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.startsWith('-'))
      fail(`브랜치 이름이 올바르지 않아요: ${branch}`);
    files.forEach(safeName);
    syncOrigin();
    const main = `origin/${defaultBranch()}`;
    if (git('status', '--porcelain'))
      fail(`원본 clone(${CLONE})에 커밋하지 않은 변경이 있어요.`);
    for (const f of files) {
      if (!(f in lock.files)) fail(`${f}는 하네스 파일이 아니에요.`);
      if (showAt(main, `rules/${f}`) !== showAt(lock.ref, `rules/${f}`))
        fail(
          `${f}는 원본에서도 바뀌었어요. /sonic-harness:update로 먼저 받으세요.`,
        );
    }
    // 프로젝트 파일을 먼저 같은 Prettier 설정으로 맞춰요. 그래야 PR이 합쳐진 뒤 update에서 '이미 같음'이 돼요.
    spawnSync(
      'npx',
      ['prettier', '--write', ...files.map((f) => join(DIR, f))],
      {
        cwd: PROJECT,
        stdio: 'ignore',
      },
    );
    git('checkout', '--quiet', '-B', branch, main);
    for (const f of files) write(join(CLONE, 'rules', f), read(join(DIR, f)));
    // status가 이 파일을 'PR 진행 중'으로 보여 주게 기록해요. update로 원본과 같아지면 지워져요.
    writeLock({
      ...lock,
      contributing: { ...lock.contributing, [branch]: { files } },
    });
    console.log(
      `✓ 원본 clone에 ${branch} 브랜치를 만들고 ${files.join(', ')}를 옮겼어요.`,
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
