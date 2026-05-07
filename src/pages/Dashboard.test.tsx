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

    const refreshButton = screen.getByRole('button', { name: /刷新/i });
    fireEvent.click(refreshButton);

    expect(refreshButton).toHaveClass('refreshing');
    expect(screen.getByText(/刷新中/i)).toBeInTheDocument();

    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
  });

  it('uses summary cards as links to the VM list instead of rendering the VM table on the homepage', () => {
    renderDashboard();

    expect(screen.getByRole('link', { name: /VM 总数/i })).toHaveAttribute('href', '/vms');
    expect(screen.getByRole('link', { name: /运行中/i })).toHaveAttribute('href', '/vms?status=running');
    expect(screen.getByRole('link', { name: /警告/i })).toHaveAttribute('href', '/vms?status=warning');
    expect(screen.getByRole('link', { name: /严重/i })).toHaveAttribute('href', '/vms?status=critical');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
