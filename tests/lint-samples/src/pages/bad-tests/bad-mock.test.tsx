// expect: sonic/no-internal-mock
import { expect, it, vi } from 'vitest';

vi.mock('@/entities/user', () => ({ useUsersQuery: () => ({ data: [] }) }));

it('사용자가 없으면 빈 상태를 보여 줘요', () => {
  expect(true).toBe(true);
});
