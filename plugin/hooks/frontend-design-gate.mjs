// PreToolUse 훅: 디자인 작업에서는 frontend-design을 먼저 쓰고, 코딩에서는 쓰지 않게 막아요.
// - 디자인 작업: explorations/ 편집, figma:figma-generate-design 스킬 → 이 세션에서 frontend-design을 먼저 불러야 해요
// - 코딩: src/ 편집 → 이 세션에서 frontend-design을 불렀으면 막아요 (디자인 세션과 코딩 세션을 나눠요)
// - src/를 고친 세션에서 frontend-design을 부르면 막아요
// 판단은 세션 기록(transcript)으로 해요. sonic-ui 저장소(scripts/hooks/)에도 같은 파일이 있어요.
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const FD = new Set(['frontend-design', 'frontend-design:frontend-design']);
const DESIGN_SKILLS = new Set([
  'figma-generate-design',
  'figma:figma-generate-design',
]);

const input = JSON.parse(readFileSync(0, 'utf8'));
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
// 하네스 플러그인으로 실행될 때는 하네스를 적용한 프로젝트에서만 동작해요
if (
  process.env.CLAUDE_PLUGIN_ROOT &&
  !existsSync(join(root, '.sonic-harness/lock.json'))
)
  process.exit(0);
const area = (file) => {
  const rel = file ? relative(root, file) : '';
  if (rel.startsWith('src/')) return 'code';
  if (rel.startsWith('explorations/')) return 'design';
  return null;
};

let usedFD = false;
let editedCode = false;
if (input.transcript_path && existsSync(input.transcript_path)) {
  for (const line of readFileSync(input.transcript_path, 'utf8').split('\n')) {
    if (!line.includes('frontend-design') && !line.includes('src/')) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const content = entry.message?.content;
    if (
      typeof content === 'string' &&
      /<command-name>\/?frontend-design(:frontend-design)?<\/command-name>/.test(
        content,
      )
    )
      usedFD = true;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type !== 'tool_use') continue;
      if (block.name === 'Skill' && FD.has(block.input?.skill)) usedFD = true;
      if (
        ['Edit', 'Write', 'MultiEdit'].includes(block.name) &&
        area(block.input?.file_path) === 'code'
      )
        editedCode = true;
    }
  }
}

const deny = (reason) => {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
};

const { tool_name: tool, tool_input: args = {} } = input;
if (tool === 'Skill') {
  if (FD.has(args.skill) && editedCode)
    deny(
      '이 세션에서 src/를 고쳤어요. 코딩은 Figma를 그대로 따라요(DESIGN.md §9). 디자인 작업은 새 세션에서 frontend-design과 함께 해요.',
    );
  if (DESIGN_SKILLS.has(args.skill) && !usedFD)
    deny(
      '화면 디자인 전에 frontend-design 스킬을 먼저 불러요(DESIGN.md §9). 색·폰트·간격은 그 제안이 아니라 토큰에서 골라요.',
    );
} else {
  const where = area(args.file_path);
  if (where === 'design' && !usedFD)
    deny(
      'explorations/ 시안을 만들기 전에 frontend-design 스킬을 먼저 불러요(DESIGN.md §9).',
    );
  if (where === 'code' && usedFD)
    deny(
      '이 세션에서 frontend-design을 썼어요. src/ 코딩은 Figma를 그대로 따라야 해서 새 세션에서 해요(DESIGN.md §9).',
    );
}
