// Titles and achievements that exist in every environment (SRS §3.8).
// The seed script writes them to the database; achievement unlock conditions
// are implemented in Milestone 6.

export type TitleRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export type TitleDefinition = {
  key: string;
  rarity: TitleRarity;
  name: { en: string; fr: string; ar: string };
};

export type AchievementDefinition = {
  code: string;
  titleKey: string | null; // title granted when unlocked
};

export const TITLES: readonly TitleDefinition[] = [
  {
    key: 'the_awakened',
    rarity: 'COMMON',
    name: { en: 'The Awakened', fr: "L'Éveillé", ar: 'المستيقظ' },
  },
  {
    key: 'early_riser',
    rarity: 'RARE',
    name: { en: 'Early Riser', fr: 'Lève-tôt', ar: 'المستيقظ باكرًا' },
  },
  {
    key: 'iron_will',
    rarity: 'EPIC',
    name: { en: 'Iron Will', fr: 'Volonté de fer', ar: 'الإرادة الحديدية' },
  },
  {
    key: 'relentless',
    rarity: 'EPIC',
    name: { en: 'Relentless', fr: 'Implacable', ar: 'الذي لا يتوقف' },
  },
  {
    key: 'unbreakable',
    rarity: 'LEGENDARY',
    name: { en: 'Unbreakable', fr: 'Inébranlable', ar: 'الذي لا يُكسر' },
  },
  {
    key: 'rising_challenger',
    rarity: 'RARE',
    name: { en: 'Rising Challenger', fr: 'Challenger en ascension', ar: 'المتحدّي الصاعد' },
  },
  {
    key: 'vanguard',
    rarity: 'EPIC',
    name: { en: 'Vanguard', fr: 'Avant-garde', ar: 'الطليعة' },
  },
  {
    key: 'elite',
    rarity: 'LEGENDARY',
    name: { en: 'Elite', fr: 'Élite', ar: 'النخبة' },
  },
  {
    key: 'sovereign',
    rarity: 'MYTHIC',
    name: { en: 'Sovereign', fr: 'Souverain', ar: 'صاحب السيادة' },
  },
  {
    key: 'proven',
    rarity: 'LEGENDARY',
    name: { en: 'Proven', fr: 'Accompli', ar: 'صاحب الإنجاز' },
  },
];

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { code: 'FIRST_STEP', titleKey: null }, // complete the first quest
  { code: 'AWAKENED', titleKey: 'the_awakened' }, // reach level 5
  { code: 'STREAK_7', titleKey: null },
  { code: 'STREAK_30', titleKey: 'iron_will' },
  { code: 'STREAK_100', titleKey: 'unbreakable' },
  { code: 'QUESTS_100', titleKey: 'relentless' }, // 100 quests completed
  { code: 'EARLY_RISER', titleKey: 'early_riser' }, // 20 quests completed before 8:00
  { code: 'REDEMPTION', titleKey: null }, // complete a penalty quest
  { code: 'ALLY', titleKey: null }, // first friend
  { code: 'RANK_C', titleKey: 'rising_challenger' },
  { code: 'RANK_B', titleKey: 'vanguard' },
  { code: 'RANK_A', titleKey: 'elite' },
  { code: 'RANK_S', titleKey: 'sovereign' },
  { code: 'FIRST_LEGENDARY', titleKey: 'proven' }, // first verified real-life achievement
];
