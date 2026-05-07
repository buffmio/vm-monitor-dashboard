import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockVms } from '../data/mockVms';
import { fetchVms } from './apiClient';

describe('apiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to mock VMs when the API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(fetchVms('token')).resolves.toEqual(mockVms);
  });
});
