// 프로젝트 ESLint 설정 (Next.js).
// 하네스 공통 규칙은 .sonic-harness/eslint.base.mjs에 있어요(/sonic-harness:update로 갱신).
// 공통 규칙을 바꾸고 싶으면 그 파일을 고친 뒤 /sonic-harness:contribute로 원본에 PR을 올려요.
import nextPlugin from '@next/eslint-plugin-next';

import harness from './.sonic-harness/eslint.base.mjs';
// 디자인 규칙(sonic-ui): npm i @xonic0506/sonic-ui 후 아래 줄과 배열 안 sonicDesign 주석을 풀어요.
// import sonicDesign from '@xonic0506/sonic-ui/eslint-design-rules';

export default [
  ...harness,
  nextPlugin.configs['core-web-vitals'],
  // sonicDesign,
  // 이 프로젝트에만 필요한 규칙은 여기에 둬요.
];
