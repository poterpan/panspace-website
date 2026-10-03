import { describe, expect, it } from 'vitest';
import { formatPeriod, formatYm } from '../../src/lib/dates';

describe('dates', () => {
  it('formats YYYY-MM', () => expect(formatYm('2024-03')).toBe('2024.03'));
  it('formats periods per language', () => {
    expect(formatPeriod('2024-03', undefined, 'zh')).toBe('2024.03');
    expect(formatPeriod('2024-03', 'present', 'zh')).toBe('2024.03 – 現在');
    expect(formatPeriod('2024-03', 'present', 'en')).toBe('2024.03 – Present');
    expect(formatPeriod('2023-08', '2024-07', 'en')).toBe('2023.08 – 2024.07');
    expect(formatPeriod('2023-08', '2023-08', 'en')).toBe('2023.08');
  });
});
