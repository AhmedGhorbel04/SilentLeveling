import type { Quest } from '../../api/quests';

// 'YYYY-MM-DD' + n days, without time-zone surprises (calculated in UTC)
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The due day of a quest as 'YYYY-MM-DD' in the browser's time zone.
// dueAt is the next local midnight, so 1 ms before it is still the due day.
export function dueDateOf(quest: Quest): string {
  const lastMoment = new Date(new Date(quest.dueAt).getTime() - 1);
  const local = new Date(lastMoment.getTime() - lastMoment.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
