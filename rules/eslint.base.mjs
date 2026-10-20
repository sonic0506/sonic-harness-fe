// 하네스 공통 ESLint 규칙. 프로젝트에서는 .sonic-harness/eslint.base.mjs로 들어가요.
// 설명과 예시는 harness.md에 있어요. 이 프로젝트만의 규칙은 프로젝트 eslint.config.mjs에 둬요.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';
import checkFile from 'eslint-plugin-check-file';
import globals from 'globals';
// sonic-ui 디자인 규칙(eslint-design-rules)이 no-restricted-syntax를 쓰므로 하네스는 그 규칙을 쓰지 않아요
// (flat config는 같은 규칙을 덮어써요).

const SRC = 'src/**/*.{ts,tsx}';

// 레이어 순서: 위 레이어는 아래 레이어만 가져올 수 있어요.
const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
const below = (layer) => LAYERS.slice(LAYERS.indexOf(layer) + 1);

// 모든 파일에 적용하는 import 제한. 아래에서 다시 쓸 때 함께 넣어요(규칙 옵션은 합쳐지지 않아요).
const RESTRICTED_PATHS = [
  {
    name: '@tanstack/react-query',
    importNames: ['useQuery', 'useQueries'],
    message:
      '조회는 useSuspenseQuery를 써요. 로딩·에러는 Suspense와 ErrorBoundary가 맡아요.',
  },
  { name: 'axios', message: 'HTTP는 shared/api의 http 클라이언트를 써요.' },
];
const ZUSTAND = {
  name: 'zustand',
  message:
    'Zustand는 store/ segment에서만 써요. 지금 전역 store는 entities/session 하나예요. 새 store가 필요하면 먼저 사용자에게 물어봐요.',
};
const PROPS_ONLY =
  'entities/*/ui는 props로만 데이터를 받아요. 조회 훅은 widgets/pages에서 불러 내려 줘요.';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'build',
      '.next',
      'coverage',
      'playwright-report',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  { files: ['src/**'], languageOptions: { globals: globals.browser } },
  {
    files: ['*.{js,mjs,cjs,ts}', 'scripts/**', 'tests/**/*.mjs', 'e2e/**'],
    languageOptions: { globals: globals.node },
  },

  // 이름 규칙
  {
    files: [SRC],
    plugins: { 'check-file': checkFile },
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'check-file/filename-naming-convention': [
        'error',
        { 'src/**/*.{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': [
        'error',
        { 'src/**/': 'KEBAB_CASE' },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
        // 라이브러리가 정한 이름을 꺼내 쓰는 경우는 검사하지 않아요.
        {
          selector: 'variable',
          types: ['boolean'],
          modifiers: ['destructured'],
          format: null,
        },
        {
          selector: 'variable',
          types: ['boolean'],
          format: ['PascalCase'],
          prefix: ['is', 'has', 'can'],
        },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
      ],
    },
  },

  // FSD 레이어 경계
  {
    files: [SRC],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      // 진입 파일(src/main.tsx 등)은 레이어 밖이라 검사하지 않아요. main.tsx는 @/app만 불러요.
      'boundaries/include': [
        'src/{app,pages,widgets,features,entities,shared}/**/*',
      ],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'pages', pattern: 'src/pages/*', capture: ['slice'] },
        { type: 'widgets', pattern: 'src/widgets/*', capture: ['slice'] },
        {
          type: 'features',
          pattern: 'src/features/*/*',
          capture: ['domain', 'slice'],
        },
        { type: 'entities', pattern: 'src/entities/*', capture: ['slice'] },
        { type: 'shared', pattern: 'src/shared' },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            'FSD: {{from.element.type}} → {{to.element.type}} import는 안 돼요. 아래 레이어의 다른 slice만, 그 index.ts로 가져와요(app → pages → widgets → features → entities → shared).',
          policies: [
            // 같은 slice 안은 자유롭게
            { allow: { dependency: { relationship: { to: 'internal' } } } },
            { allow: { to: { module: { origin: 'external' } } } },
            // 아래 레이어 slice는 public API(index.ts)로만
            ...LAYERS.slice(0, -2).map((layer) => ({
              from: { element: { type: layer } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: below(layer).filter((t) => t !== 'shared'),
                    },
                    fileInternalPath: 'index.{ts,tsx}',
                  },
                },
              },
            })),
            // shared는 segment마다 index.ts (shared/ui/index.ts, shared/api/index.ts …)
            {
              from: { element: { types: { anyOf: LAYERS.slice(0, -1) } } },
              allow: {
                to: {
                  element: {
                    type: 'shared',
                    fileInternalPath: '*/index.{ts,tsx}',
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },

  // import 제한
  {
    files: [SRC],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [...RESTRICTED_PATHS, ZUSTAND] },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'fetch는 api/ segment에서만 써요(shared/api의 http 클라이언트).',
        },
      ],
    },
  },
  {
    files: ['src/**/store/**'],
    rules: { 'no-restricted-imports': ['error', { paths: RESTRICTED_PATHS }] },
  },
  { files: ['src/**/api/**'], rules: { 'no-restricted-globals': 'off' } },
  {
    files: ['src/entities/*/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...RESTRICTED_PATHS.slice(1),
            ZUSTAND,
            { name: '@tanstack/react-query', message: PROPS_ONLY },
          ],
          patterns: [
            {
              group: [
                '../api',
                '../api/*',
                '../hooks',
                '../hooks/*',
                '../store',
                '../store/*',
              ],
              message: PROPS_ONLY,
            },
          ],
        },
      ],
    },
  },
);
