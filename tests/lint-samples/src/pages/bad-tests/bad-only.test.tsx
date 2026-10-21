// expect: vitest/no-focused-tests
import { expect, it } from 'vitest';

it.only('이 테스트만 돌려요', () => {
  expect(true).toBe(true);
});
