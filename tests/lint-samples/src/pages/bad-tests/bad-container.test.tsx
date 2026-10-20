// expect: testing-library/no-container, testing-library/no-node-access
import { render } from '@testing-library/react';
import { expect, it } from 'vitest';

it('목록을 보여 줘요', () => {
  const { container } = render(<ul className="list" />);
  expect(container.querySelector('.list')).not.toBeNull();
});
