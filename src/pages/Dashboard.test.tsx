import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../lib/auth';
import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  function renderDashboard() {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it('shows a refresh animation state when the refresh button is clicked', () => {
    vi.useFakeTimers();

    renderDashboard();

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(refreshButton).toHaveClass('refreshing');
    expect(screen.getByText(/refreshing/i)).toBeInTheDocument();

    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
  });

  it('uses summary cards as links to the VM list instead of rendering the VM table on the homepage', () => {
    renderDashboard();

    expect(screen.getByRole('link', { name: /total vms/i })).toHaveAttribute('href', '/vms');
    expect(screen.getByRole('link', { name: /running/i })).toHaveAttribute('href', '/vms?status=running');
    expect(screen.getByRole('link', { name: /warnings/i })).toHaveAttribute('href', '/vms?status=warning');
    expect(screen.getByRole('link', { name: /critical/i })).toHaveAttribute('href', '/vms?status=critical');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
