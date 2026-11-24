// Achievement unlock conditions (SRS §3.8). Pure: the service gives a snapshot of
// the player, this decides which achievements that snapshot deserves.

export type PlayerSnapshot = {
  level: number;
  rank: string; // 'E4' ... 'SS'
  bestStreak: number;
  // Completed system and penalty quests. Custom quests do not count: they can be
  // created and completed without limit, so they would make these achievements free.
  questsCompleted: number;
  questsCompletedBefore8am: number; // in the player's time zone
  penaltyQuestsCompleted: number;
  friends: number;
  verifiedAchievements: number; // approved real-life claims (Legendary or Mythic)
};

const RANK_LETTERS = ['E', 'D', 'C', 'B', 'A', 'S'];

// 'C2' → 2 (index of C), 'SS' counts as S
function rankLetterIndex(rank: string): number {
  return RANK_LETTERS.indexOf(rank[0]!);
}

function reachedRank(snapshot: PlayerSnapshot, letter: string): boolean {
  return rankLetterIndex(snapshot.rank) >= RANK_LETTERS.indexOf(letter);
}

export const ACHIEVEMENT_CONDITIONS: Record<string, (s: PlayerSnapshot) => boolean> = {
  FIRST_STEP: (s) => s.questsCompleted >= 1,
  AWAKENED: (s) => s.level >= 5,
  STREAK_7: (s) => s.bestStreak >= 7,
  STREAK_30: (s) => s.bestStreak >= 30,
  STREAK_100: (s) => s.bestStreak >= 100,
  QUESTS_100: (s) => s.questsCompleted >= 100,
  EARLY_RISER: (s) => s.questsCompletedBefore8am >= 20,
  REDEMPTION: (s) => s.penaltyQuestsCompleted >= 1,
  ALLY: (s) => s.friends >= 1,
  RANK_C: (s) => reachedRank(s, 'C'),
  RANK_B: (s) => reachedRank(s, 'B'),
  RANK_A: (s) => reachedRank(s, 'A'),
  RANK_S: (s) => reachedRank(s, 'S'),
  FIRST_LEGENDARY: (s) => s.verifiedAchievements >= 1,
};

// Achievements the snapshot deserves that are not unlocked yet
export function newlyEarnedAchievements(
  snapshot: PlayerSnapshot,
  alreadyUnlocked: Set<string>,
): string[] {
  return Object.entries(ACHIEVEMENT_CONDITIONS)
    .filter(([code, condition]) => !alreadyUnlocked.has(code) && condition(snapshot))
    .map(([code]) => code);
}
