import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderWithQuery, server } from '@/shared/testing';
import { UserListPage } from './user-list-page';

describe('UserListPage', () => {
  it('사용자 목록을 보여 줘요', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json([{ id: '1', name: '김소닉', isActive: true }]),
      ),
    );
    renderWithQuery(<UserListPage />, { searchParams: '?page=1' });
    expect(
      await screen.findByRole('button', { name: '김소닉' }),
    ).toBeInTheDocument();
  });

  it('사용자를 누르면 고른 사용자를 알려 줘요', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json([{ id: '1', name: '김소닉', isActive: true }]),
      ),
    );
    renderWithQuery(<UserListPage />);
    await user.click(await screen.findByRole('button', { name: '김소닉' }));
    expect(screen.getByRole('button', { name: '김소닉' })).toBeEnabled();
  });
});
