import { describe, expect, it } from 'vitest';
import {
  addDays,
  endOfLocalDay,
  endOfLocalWeek,
  fromDbDate,
  localDate,
  mondayOf,
  toDbDate,
} from '../../src/utils/time.js';

describe('localDate', () => {
  it('depends on the player time zone', () => {
    const instant = new Date('2026-11-24T23:30:00Z');

    expect(localDate('UTC', instant)).toBe('2026-11-24');
    expect(localDate('Africa/Tunis', instant)).toBe('2026-11-25'); // UTC+1
    expect(localDate('America/New_York', instant)).toBe('2026-11-24'); // UTC−5
  });
});

describe('day and week boundaries', () => {
  it('ends the day at local midnight', () => {
    expect(endOfLocalDay('2026-11-24', 'Africa/Tunis').toISOString()).toBe(
      '2026-11-24T23:00:00.000Z',
    );
  });

  it('handles daylight-saving days (23 hours long)', () => {
    // Europe/Paris switches to summer time on 29 March 2026
    const start = endOfLocalDay('2026-03-28', 'Europe/Paris');
    const end = endOfLocalDay('2026-03-29', 'Europe/Paris');

    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });

  it('finds the Monday of a week', () => {
    expect(mondayOf('2026-11-24')).toBe('2026-11-23'); // Tuesday → Monday
    expect(mondayOf('2026-11-23')).toBe('2026-11-23'); // Monday stays
    expect(mondayOf('2026-11-29')).toBe('2026-11-23'); // Sunday → previous Monday
  });

  it('ends the week on the next Monday at local midnight', () => {
    expect(endOfLocalWeek('2026-11-23', 'UTC').toISOString()).toBe('2026-11-30T00:00:00.000Z');
  });
});

describe('date helpers', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('converts to and from database dates without shifting the day', () => {
    expect(fromDbDate(toDbDate('2026-11-24'))).toBe('2026-11-24');
  });
});
