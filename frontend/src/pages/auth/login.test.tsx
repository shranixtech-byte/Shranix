import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/context/AuthContext';
import { PreferencesProvider } from '@/providers/preferences-provider';
import { ThemeProvider } from '@/providers/theme-provider';

import { LoginPage } from './login';

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts credentials to the versioned API, saves the session flag, and redirects after Sign In', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          user: {
            id: 'user-1',
            email: 'admin@shranix.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            permissions: [],
            isActive: true,
          },
          tokens: {
            accessToken: 'header.payload.signature',
            refreshToken: 'refresh-token-value',
            expiresIn: 3600,
          },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    render(
      <MemoryRouter initialEntries={['/auth/login']}>
        <ThemeProvider defaultTheme="light" storageKey="shranix-theme">
          <PreferencesProvider>
            <AuthProvider>
              <Routes>
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/" element={<div>Dashboard</div>} />
              </Routes>
            </AuthProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'admin@shranix.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'admin123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/login'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@shranix.com', password: 'admin123' }),
        }),
      ),
    );

    await screen.findByText('Dashboard');
    // Tokens live in memory + HttpOnly cookies; only the session flag is persisted
    expect(localStorage.getItem('shranix_session')).toBeTruthy();
  });
});
