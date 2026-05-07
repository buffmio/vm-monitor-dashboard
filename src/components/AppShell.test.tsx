import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders each sidebar item as a navigable link', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>content</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /virtual machines/i })).toHaveAttribute('href', '/vms');
    expect(screen.getByRole('link', { name: /alerts/i })).toHaveAttribute('href', '/alerts');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });
});
