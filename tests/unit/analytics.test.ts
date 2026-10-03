import { describe, expect, it } from 'vitest';
import { beaconConfig } from '../../src/lib/analytics';

describe('beaconConfig', () => {
  it('is null without a token', () => {
    expect(beaconConfig(undefined)).toBeNull();
    expect(beaconConfig('   ')).toBeNull();
  });
  it('serializes the token for data-cf-beacon', () => {
    expect(beaconConfig(' abc123 ')).toBe('{"token":"abc123"}');
  });
});
