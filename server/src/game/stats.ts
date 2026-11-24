import {
  CATEGORY_STAT_WEIGHTS,
  STAT_POINTS_PER_XP,
  type Category,
  type StatName,
} from './config.js';

export type StatGains = Record<StatName, number>;

export const NO_STAT_GAINS: StatGains = {
  strength: 0,
  intelligence: 0,
  discipline: 0,
  consistency: 0,
};

// Stat points earned by completing a quest of `category` that gave `xp`.
// Points = XP ÷ 10, split by the category's weights. Splitting can leave a remainder
// (e.g. 5 points split 50/50); it goes to the first stat listed, so no point is lost.
export function statGainsForQuest(category: Category, xp: number): StatGains {
  const totalPoints = Math.floor(xp * STAT_POINTS_PER_XP);
  const weights = Object.entries(CATEGORY_STAT_WEIGHTS[category]) as [StatName, number][];

  const gains: StatGains = { ...NO_STAT_GAINS };
  let distributed = 0;

  for (const [stat, weight] of weights) {
    const points = Math.floor((totalPoints * weight) / 100);
    gains[stat] += points;
    distributed += points;
  }

  const [firstStat] = weights[0]!;
  gains[firstStat] += totalPoints - distributed;

  return gains;
}
