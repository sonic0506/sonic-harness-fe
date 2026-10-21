// 이 저장소 자체를 검사하는 설정. 샘플(일부러 틀린 파일)과 템플릿은 빼요.
import globals from 'globals';
import harness from './rules/eslint.base.mjs';

export default [
  {
    ignores: [
      'tests/lint-samples/src/**',
      'templates/**',
      'templates.*/**',
      'sandbox/**',
    ],
  },
  ...harness,
  {
    files: ['plugin/**/*.mjs', 'evals/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
];
