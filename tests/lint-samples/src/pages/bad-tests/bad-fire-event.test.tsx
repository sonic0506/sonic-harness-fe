// expect: testing-library/prefer-user-event
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

it('버튼을 누르면 눌림 상태가 돼요', () => {
  render(<button>누르기</button>);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button')).toBeEnabled();
});
