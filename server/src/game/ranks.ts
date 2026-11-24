// Ranks (SRS §3.4): a rank needs a minimum level AND, from B upward,
// verified real-life achievements. The rank is the highest one meeting both.

export type RankCode = string; // 'E4', 'E3', ..., 'S1', 'SS'

export type Rank = {
  code: RankCode;
  label: string; // shown in the UI, e.g. 'C II'
  minLevel: number;
  // Verified achievements required. A Mythic achievement also counts as a Legendary one.
  requiredLegendary: number;
  requiredMythic: number;
};

export type VerifiedAchievements = {
  legendary: number; // approved claims of tier LEGENDARY
  mythic: number; // approved claims of tier MYTHIC
};

const ROMAN = ['', 'I', 'II', 'III', 'IV'];

function division(
  letter: string,
  div: number,
  minLevel: number,
  requiredLegendary = 0,
  requiredMythic = 0,
): Rank {
  return {
    code: `${letter}${div}`,
    label: `${letter} ${ROMAN[div]}`,
    minLevel,
    requiredLegendary,
    requiredMythic,
  };
}

// From lowest to highest
export const RANKS: readonly Rank[] = [
  division('E', 4, 1),
  division('E', 3, 3),
  division('E', 2, 5),
  division('E', 1, 7),
  division('D', 4, 10),
  division('D', 3, 13),
  division('D', 2, 16),
  division('D', 1, 19),
  division('C', 4, 22),
  division('C', 3, 26),
  division('C', 2, 30),
  division('C', 1, 34),
  division('B', 4, 38, 1),
  division('B', 3, 43, 1),
  division('B', 2, 48, 1),
  division('B', 1, 53, 1),
  division('A', 4, 58, 3),
  division('A', 3, 64, 3),
  division('A', 2, 70, 3),
  division('A', 1, 76, 3),
  division('S', 4, 82, 4, 1), // 1 Mythic + 3 Legendary = 4 verified in total
  division('S', 3, 89, 4, 1),
  division('S', 2, 96, 4, 1),
  division('S', 1, 103, 4, 1),
  { code: 'SS', label: 'SS', minLevel: 110, requiredLegendary: 7, requiredMythic: 2 },
];

function meetsRequirements(rank: Rank, level: number, verified: VerifiedAchievements): boolean {
  const totalVerified = verified.legendary + verified.mythic;
  return (
    level >= rank.minLevel &&
    totalVerified >= rank.requiredLegendary &&
    verified.mythic >= rank.requiredMythic
  );
}

export function rankFor(level: number, verified: VerifiedAchievements): Rank {
  // The first rank (E IV, level 1) is always reached, so the result is never undefined
  return RANKS.findLast((rank) => meetsRequirements(rank, level, verified))!;
}

export type RankStatus = {
  current: Rank;
  next: Rank | null; // null at SS
  // Set when the player's level is high enough for the next rank but real-life
  // achievements are missing ("Rank locked — prove yourself in real life")
  lockedBy: { legendary: number; mythic: number } | null;
};

export function rankStatus(level: number, verified: VerifiedAchievements): RankStatus {
  const current = rankFor(level, verified);
  const next = RANKS[RANKS.indexOf(current) + 1] ?? null;

  let lockedBy: RankStatus['lockedBy'] = null;
  if (next && level >= next.minLevel) {
    const missingMythic = Math.max(0, next.requiredMythic - verified.mythic);
    const totalVerified = verified.legendary + verified.mythic;
    // Missing Mythic achievements will also count as Legendary ones once earned
    const missingLegendary = Math.max(0, next.requiredLegendary - totalVerified - missingMythic);
    lockedBy = { legendary: missingLegendary, mythic: missingMythic };
  }

  return { current, next, lockedBy };
}
