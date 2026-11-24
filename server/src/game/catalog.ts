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
  // Titles of legendary quests
  {
    key: 'marathoner',
    rarity: 'LEGENDARY',
    name: { en: 'Marathoner', fr: 'Marathonien', ar: 'عدّاء الماراثون' },
  },
  {
    key: 'professional',
    rarity: 'LEGENDARY',
    name: { en: 'Professional', fr: 'Professionnel', ar: 'المحترف' },
  },
  {
    key: 'polyglot',
    rarity: 'LEGENDARY',
    name: { en: 'Polyglot', fr: 'Polyglotte', ar: 'متعدد اللغات' },
  },
  { key: 'creator', rarity: 'LEGENDARY', name: { en: 'Creator', fr: 'Créateur', ar: 'المبدع' } },
  { key: 'scholar', rarity: 'LEGENDARY', name: { en: 'Scholar', fr: 'Érudit', ar: 'العلّامة' } },
  { key: 'graduate', rarity: 'LEGENDARY', name: { en: 'Graduate', fr: 'Diplômé', ar: 'الخرّيج' } },
  { key: 'founder', rarity: 'MYTHIC', name: { en: 'Founder', fr: 'Fondateur', ar: 'المؤسّس' } },
  {
    key: 'iron_titan',
    rarity: 'MYTHIC',
    name: { en: 'Iron Titan', fr: 'Titan de fer', ar: 'العملاق الحديدي' },
  },
];

export type LegendaryQuestDefinition = {
  key: string;
  category: 'FITNESS' | 'STUDIES' | 'LANGUAGES' | 'READING' | 'CAREER' | 'HEALTH';
  tier: 'LEGENDARY' | 'MYTHIC';
  xpReward: number;
  titleKey: string;
  title: { en: string; fr: string; ar: string };
};

// Real-life achievements players can claim; an admin verifies the proof (SRS §3.4)
export const LEGENDARY_QUESTS: readonly LegendaryQuestDefinition[] = [
  {
    key: 'marathon',
    category: 'FITNESS',
    tier: 'LEGENDARY',
    xpReward: 3000,
    titleKey: 'marathoner',
    title: { en: 'Run a marathon', fr: 'Courir un marathon', ar: 'الجري في ماراثون' },
  },
  {
    key: 'first_job',
    category: 'CAREER',
    tier: 'LEGENDARY',
    xpReward: 3000,
    titleKey: 'professional',
    title: {
      en: 'Get your first job or internship in your field',
      fr: 'Décrocher ton premier emploi ou stage dans ton domaine',
      ar: 'الحصول على أول وظيفة أو تدريب في مجالك',
    },
  },
  {
    key: 'language_c1',
    category: 'LANGUAGES',
    tier: 'LEGENDARY',
    xpReward: 3000,
    titleKey: 'polyglot',
    title: {
      en: 'Get a C1 language certificate',
      fr: 'Obtenir un certificat de langue niveau C1',
      ar: 'الحصول على شهادة لغة بمستوى C1',
    },
  },
  {
    key: 'published_app',
    category: 'STUDIES',
    tier: 'LEGENDARY',
    xpReward: 3000,
    titleKey: 'creator',
    title: {
      en: 'Publish an app or website used by 100 people',
      fr: 'Publier une application ou un site utilisé par 100 personnes',
      ar: 'نشر تطبيق أو موقع يستخدمه 100 شخص',
    },
  },
  {
    key: 'books_50',
    category: 'READING',
    tier: 'LEGENDARY',
    xpReward: 2500,
    titleKey: 'scholar',
    title: { en: 'Read 50 books', fr: 'Lire 50 livres', ar: 'قراءة 50 كتابًا' },
  },
  {
    key: 'degree',
    category: 'STUDIES',
    tier: 'LEGENDARY',
    xpReward: 4000,
    titleKey: 'graduate',
    title: {
      en: 'Graduate from university',
      fr: 'Obtenir ton diplôme universitaire',
      ar: 'التخرّج من الجامعة',
    },
  },
  {
    key: 'startup',
    category: 'CAREER',
    tier: 'MYTHIC',
    xpReward: 8000,
    titleKey: 'founder',
    title: {
      en: 'Found a company with paying customers',
      fr: 'Fonder une entreprise avec des clients payants',
      ar: 'تأسيس شركة لديها عملاء يدفعون',
    },
  },
  {
    key: 'ironman',
    category: 'FITNESS',
    tier: 'MYTHIC',
    xpReward: 8000,
    titleKey: 'iron_titan',
    title: {
      en: 'Finish an Ironman triathlon',
      fr: 'Terminer un triathlon Ironman',
      ar: 'إنهاء سباق آيرون مان الثلاثي',
    },
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
