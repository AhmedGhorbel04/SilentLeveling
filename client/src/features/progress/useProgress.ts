import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboard';
import { dashboardKey } from '../quests/useQuests';

// Under the dashboard key: completing a quest invalidates it, so the chart stays fresh
export function useXpHistory(days: number) {
  return useQuery({
    queryKey: [...dashboardKey, 'xp-history', days],
    queryFn: () => dashboardApi.xpHistory(days),
    select: (d) => d.days,
    placeholderData: keepPreviousData, // no flicker when switching 7 / 30 / 90 days
  });
}

export function useCalendar(month: string) {
  return useQuery({
    queryKey: [...dashboardKey, 'calendar', month],
    queryFn: () => dashboardApi.calendar(month),
    select: (d) => d.days,
    placeholderData: keepPreviousData,
  });
}
