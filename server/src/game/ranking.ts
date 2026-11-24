import { RANKS } from './ranks.js';
import type { TitleRarity } from './catalog.js';

// Friends ranking (SRS §4.6, FR-54). Pure: sorts players given their numbers.

// Between SS players, titles decide (SRS §3.4), weighted by rarity
export const TITLE_RARITY_POINTS: Record<TitleRarity, number> = {
  COMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 5,
  MYTHIC: 8,
};

export function titleScore(rarities: TitleRarity[]): number {
  return rarities.reduce((sum, rarity) => sum + TITLE_RARITY_POINTS[rarity], 0);
}

export type RankedPlayer = {
  username: string;
  rank: string; // 'E4' ... 'SS'
  totalXp: number;
  weeklyXp: number;
  titleScore: number;
};

const rankIndex = (code: string) => RANKS.findIndex((rank) => rank.code === code);

// All-time: higher rank first; between SS players the title score decides;
// then total XP; then the username, so the order never changes randomly
export function compareAllTime(a: RankedPlayer, b: RankedPlayer): number {
  return (
    rankIndex(b.rank) - rankIndex(a.rank) ||
    (a.rank === 'SS' && b.rank === 'SS' ? b.titleScore - a.titleScore : 0) ||
    b.totalXp - a.totalXp ||
    a.username.localeCompare(b.username)
  );
}

// Weekly: XP earned since Monday, so a new player can beat a veteran this week
export function compareWeekly(a: RankedPlayer, b: RankedPlayer): number {
  return b.weeklyXp - a.weeklyXp || a.username.localeCompare(b.username);
}
