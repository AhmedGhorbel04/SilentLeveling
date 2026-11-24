import type { TitleRarity } from '../../api/achievements';

// Rarity colours from the design tokens (SRS §9): grey, blue, violet, amber, red-magenta
export const RARITY_TEXT: Record<TitleRarity, string> = {
  COMMON: 'text-rarity-common',
  RARE: 'text-rarity-rare',
  EPIC: 'text-rarity-epic',
  LEGENDARY: 'text-rarity-legendary',
  MYTHIC: 'text-rarity-mythic',
};

export const RARITY_BORDER: Record<TitleRarity, string> = {
  COMMON: 'border-rarity-common/50',
  RARE: 'border-rarity-rare/60',
  EPIC: 'border-rarity-epic/60',
  LEGENDARY: 'border-rarity-legendary/70',
  MYTHIC: 'border-rarity-mythic/70',
};

export const ACHIEVEMENT_ICONS: Record<string, string> = {
  FIRST_STEP: '👣',
  AWAKENED: '🌅',
  STREAK_7: '🔥',
  STREAK_30: '⚔️',
  STREAK_100: '💎',
  QUESTS_100: '🏹',
  EARLY_RISER: '🌄',
  REDEMPTION: '🛡️',
  ALLY: '🤝',
  RANK_C: '🥉',
  RANK_B: '🥈',
  RANK_A: '🥇',
  RANK_S: '👑',
  FIRST_LEGENDARY: '🏆',
};
