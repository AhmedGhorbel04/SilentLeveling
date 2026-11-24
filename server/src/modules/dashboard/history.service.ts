import { DateTime } from 'luxon';
import { prisma } from '../../lib/prisma.js';
import { addDays, fromDbDate, localDate, startOfLocalDay, toDbDate } from '../../utils/time.js';

export type XpDay = { date: string; xp: number };

// XP earned per local day over the last `days` days, today included (FR-44).
// Days without XP are returned with 0 so the chart has no gaps.
export async function getXpHistory(userId: string, days: number, now = new Date()) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const today = localDate(user.timezone, now);
  const from = addDays(today, -(days - 1));

  // created_at is stored in UTC: convert it to the player's time zone before grouping
  const rows = await prisma.$queryRaw<{ day: string; xp: bigint }[]>`
    SELECT to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE ${user.timezone}, 'YYYY-MM-DD') AS day,
           SUM(amount) AS xp
    FROM xp_transactions
    WHERE user_id = ${userId}::uuid AND created_at >= ${startOfLocalDay(from, user.timezone)}
    GROUP BY day`;
  const byDay = new Map(rows.map((r) => [r.day, Number(r.xp)]));

  const history: XpDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    history.push({ date, xp: byDay.get(date) ?? 0 });
  }
  return history;
}

export type CalendarDay = {
  date: string;
  questsTotal: number;
  questsCompleted: number;
  allCompleted: boolean;
};

// The closed days of a month ('2026-11'), for the calendar (FR-44)
export async function getCalendar(userId: string, month: string): Promise<CalendarDay[]> {
  const start = DateTime.fromISO(`${month}-01`, { zone: 'utc' });
  const logs = await prisma.dailyLog.findMany({
    where: {
      userId,
      date: {
        gte: toDbDate(start.toISODate()!),
        lt: toDbDate(start.plus({ months: 1 }).toISODate()!),
      },
    },
    orderBy: { date: 'asc' },
  });
  return logs.map((log) => ({
    date: fromDbDate(log.date),
    questsTotal: log.questsTotal,
    questsCompleted: log.questsCompleted,
    allCompleted: log.allCompleted,
  }));
}
