import { describe, expect, it } from 'vitest';
import { TILT_RANGE_DEG, tiltFor, tiltTransform } from '../../src/lib/tilt';

describe('tiltFor', () => {
  it('is flat at the center', () => {
    expect(tiltFor(50, 50, 100, 100)).toEqual({ rotateX: 0, rotateY: 0 });
  });
  it('tilts toward the pointer, ±range/2 at the edges', () => {
    expect(tiltFor(100, 0, 100, 100)).toEqual({ rotateX: 3.5, rotateY: 3.5 });
    expect(tiltFor(0, 100, 100, 100)).toEqual({ rotateX: -3.5, rotateY: -3.5 });
  });
  it('never exceeds 7 degrees, even outside the card', () => {
    for (const [x, y] of [[-500, -500], [900, 900], [100, -20]]) {
      const t = tiltFor(x!, y!, 100, 100);
      expect(Math.abs(t.rotateX)).toBeLessThanOrEqual(TILT_RANGE_DEG);
      expect(Math.abs(t.rotateY)).toBeLessThanOrEqual(TILT_RANGE_DEG);
    }
  });
  it('handles zero-size boxes', () => {
    expect(tiltFor(10, 10, 0, 0)).toEqual({ rotateX: 0, rotateY: 0 });
  });
  it('builds a CSS transform', () => {
    expect(tiltTransform({ rotateX: 1.5, rotateY: -2 })).toBe('perspective(700px) rotateX(1.5deg) rotateY(-2deg) translateZ(4px)');
  });
});
