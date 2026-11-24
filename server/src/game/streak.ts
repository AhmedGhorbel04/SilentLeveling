// Discipline streak (SRS §3.7): consecutive days on which all daily quests were completed.

export type StreakState = {
  current: number;
  best: number;
  // Value to give back if the penalty quest is completed; null when there is nothing to restore
  beforePenalty: number | null;
};

// Applies the result of one finished day to the streak.
export function recordDay(state: StreakState, allDailyQuestsCompleted: boolean): StreakState {
  if (allDailyQuestsCompleted) {
    const current = state.current + 1;
    return { current, best: Math.max(state.best, current), beforePenalty: null };
  }

  // Missed day: the streak breaks, but is remembered so the penalty quest can restore it.
  // The penalty quest is a single chance: missing the next day too loses the streak for good.
  return {
    current: 0,
    best: state.best,
    beforePenalty: state.current > 0 ? state.current : null,
  };
}

// Called when the penalty quest is completed in time: the streak comes back.
// The missed day itself does not count.
export function restoreStreak(state: StreakState): StreakState {
  if (state.beforePenalty === null) return state;

  const current = state.current + state.beforePenalty;
  return { current, best: Math.max(state.best, current), beforePenalty: null };
}

export type DayLog = { questsTotal: number; questsCompleted: number };

// Percentage of daily quests completed over the given days (the last 30 days in the app).
// Returns null when there is nothing to measure yet (a brand new player).
export function disciplineRate(days: DayLog[]): number | null {
  const total = days.reduce((sum, day) => sum + day.questsTotal, 0);
  if (total === 0) return null;

  const completed = days.reduce((sum, day) => sum + day.questsCompleted, 0);
  return Math.round((completed / total) * 100);
}
