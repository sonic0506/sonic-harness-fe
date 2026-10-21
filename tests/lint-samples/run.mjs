// 샘플마다 기대한 규칙만 정확히 나오는지 확인해요.
// 첫 줄이 `// expect: 규칙, 규칙`인 파일은 그 규칙만, 나머지 파일은 0건이어야 해요.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const eslint = spawnSync(
  'npx',
  [
    'eslint',
    '--format',
    'json',
    '--config',
    '../../rules/eslint.base.mjs',
    'src',
  ],
  { cwd: dir, encoding: 'utf8', maxBuffer: 1 << 26 },
);
if (!eslint.stdout) throw new Error(eslint.stderr);

let failures = 0;
for (const result of JSON.parse(eslint.stdout)) {
  const file = relative(dir, result.filePath);
  const expectLine = readFileSync(result.filePath, 'utf8').match(
    /^\/\/ expect: (.+)$/m,
  );
  const expected = expectLine
    ? expectLine[1]
        .split(',')
        .map((s) => s.trim())
        .sort()
    : [];
  const actual = [
    ...new Set(result.messages.map((m) => m.ruleId ?? 'parse-error')),
  ].sort();
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  if (!ok) {
    failures++;
    console.log(
      `✗ ${file}\n  기대: ${expected.join(', ') || '없음'}\n  실제: ${actual.join(', ') || '없음'}`,
    );
    for (const m of result.messages)
      console.log(`    ${m.line}:${m.column} ${m.ruleId} ${m.message}`);
  } else {
    console.log(
      `✓ ${file}${expected.length ? ` (${expected.join(', ')})` : ''}`,
    );
  }
}
console.log(
  failures
    ? `\n${failures}개 샘플이 기대와 달라요.`
    : '\n모든 샘플이 기대대로예요.',
);
process.exit(failures ? 1 : 0);
