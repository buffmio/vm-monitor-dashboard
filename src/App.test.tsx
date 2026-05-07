import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AUTH_TOKEN_KEY } from './lib/auth';

describe('App navigation alignment', () => {
  beforeEach(() => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('aligns routed pages to the top after sidebar navigation', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    scrollTo.mockClear();

    fireEvent.click(screen.getByRole('link', { name: /settings/i }));

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
    });
  });

  it('returns from VM detail to the originating VM list filter', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });

    render(
      <MemoryRouter initialEntries={['/vms?status=critical']}>
        <App />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByText('db-prod-02'));
    expect(await screen.findByRole('heading', { name: 'db-prod-02' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back to vm list/i }));

    expect(await screen.findByRole('heading', { name: /virtual machines/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /critical/i })).toHaveClass('selected');
    expect(screen.getByText(/1 machines match the current view/i)).toBeInTheDocument();
  });

  it('returns from VM detail to the originating alerts page', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });

    render(
      <MemoryRouter initialEntries={['/alerts']}>
        <App />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('link', { name: /db-prod-02 \/ disk/i }));
    expect(await screen.findByRole('heading', { name: 'db-prod-02' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back to alerts/i }));

    expect(await screen.findByRole('heading', { name: 'Alerts', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/active vm alerts/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', async () => {
    localStorage.clear();

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});
