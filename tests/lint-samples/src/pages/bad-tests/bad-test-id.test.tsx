// expect: sonic/no-test-id
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

it('목록을 보여 줘요', () => {
  render(<ul data-testid="list" />);
  expect(screen.getByTestId('list')).toBeInTheDocument();
});
