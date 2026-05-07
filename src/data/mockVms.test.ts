import { describe, expect, it } from 'vitest';
import { mockVms } from './mockVms';

describe('mockVms', () => {
  it('uses user-defined locations instead of cloud-provider region codes', () => {
    const cloudRegionPattern = /^(us|eu|ap|sa|ca|me|af)-(north|south|east|west|central|northeast|southeast|southwest|northwest)-\d+$/;

    expect(mockVms.map((vm) => vm.region).filter((region) => cloudRegionPattern.test(region))).toEqual([]);
  });
});
