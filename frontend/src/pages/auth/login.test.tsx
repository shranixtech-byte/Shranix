import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/context/AuthContext';

import { LoginPage } from './login';

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts credentials to the versioned API, saves tokens, and redirects after Sign In', async () => {
    const nativeFetch = globalThis.fetch.bind(globalThis);
    const fetchSpy = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      nativeFetch(input, init),
    );
    vi.stubGlobal('fetch', fetchSpy);

    render(
      <MemoryRouter initialEntries={['/auth/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/" element={<div>Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'admin@shranix.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'admin123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@shranix.com', password: 'admin123' }),
        }),
      ),
    );

    await screen.findByText('Dashboard');
    expect(localStorage.getItem('access_token')).toBeTruthy();
    expect(localStorage.getItem('refresh_token')).toBeTruthy();
  });
});
