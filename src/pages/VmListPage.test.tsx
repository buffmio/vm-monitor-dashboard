import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../lib/auth';
import { VmListPage } from './VmListPage';

describe('VmListPage', () => {
  function renderPage(initialEntry = '/vms') {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <AuthProvider>
          <VmListPage />
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it('renders the VM table on a dedicated page', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /virtual machines/i })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText(/machines match the current view/i)).toBeInTheDocument();
  });

  it('presents location without repeating hostname as a host column', () => {
    renderPage();

    expect(screen.queryByRole('columnheader', { name: 'Host' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Location' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search name, ip, or location/i)).toBeInTheDocument();
  });

  it('uses status query params as the initial filter', () => {
    renderPage('/vms?status=critical');

    expect(screen.getByRole('button', { name: /critical/i })).toHaveClass('selected');
    expect(screen.getByText(/1 machines match the current view/i)).toBeInTheDocument();
  });
});
